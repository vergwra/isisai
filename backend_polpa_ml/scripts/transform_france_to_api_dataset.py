# scripts/transform_france_to_api_dataset.py
import pandas as pd
import numpy as np
import unicodedata
import calendar
from pathlib import Path
import argparse

MAP_DIR = Path("data/mappings")  # crie essa pasta no projeto
MAP_DIR.mkdir(parents=True, exist_ok=True)

def load_map_csv(path: Path, key_col: str, val_col: str) -> dict:
    if not path.exists():
        return {}
    dfm = pd.read_csv(path)
    dfm[key_col] = dfm[key_col].astype(str).str.strip()
    dfm[val_col] = dfm[val_col].astype(str).str.strip()
    # Só entradas com valor preenchido
    dfm = dfm[dfm[val_col] != ""]
    return dict(zip(dfm[key_col], dfm[val_col]))

depot_to_porto = load_map_csv(MAP_DIR / "mapping_depot_to_porto.csv", "depot", "origem_porto")
dest_to_porto  = load_map_csv(MAP_DIR / "mapping_dest_to_porto.csv", "destinataire", "destino_porto")
article_to_tipo = load_map_csv(MAP_DIR / "mapping_article_to_tipo.csv", "article", "tipo_produto")

def norm(s):
    if not isinstance(s, str):
        return str(s)
    s = unicodedata.normalize("NFKD", s).encode("ASCII","ignore").decode("ASCII")
    s = s.replace("\n"," ").replace("/", " ").replace("-", " ").replace(".", " ")
    s = "_".join(p for p in s.strip().split() if p)
    return s.lower()

def month_bounds(dt):
    if pd.isna(dt):
        return ("2025/01/01", "2025/01/31")
    year = dt.year; month = dt.month
    start = f"{year:04d}/{month:02d}/01"
    end = f"{year:04d}/{month:02d}/{calendar.monthrange(year, month)[1]}"
    return (start, end)

def build_dataset(input_xlsx: Path, sheet: str, out_csv: Path):
    # 1) ler excel (cabeçalho está na linha 2 → header=1)
    df = pd.read_excel(input_xlsx, sheet_name=sheet, header=1)
    df.columns = [norm(c) for c in df.columns]

    # 2) ---- EDITAR ESTES MAPAS COM A SUA REALIDADE ----
    depot_to_porto = {
        # "paris": "Le Havre",
        # "lyon": "Fos-sur-Mer",
    }
    dest_to_porto = {
        # "netherlands": "Rotterdam",
        # "belgium": "Antwerp",
    }
    article_to_tipo = {
        # "GOIABA_PULPE": "polpa_de_goiaba",
        # "MANGA_PULPE": "polpa_de_manga",
    }
    # ---------------------------------------------------

    def guess_origem_porto(row):
        depot = str(row.get("depot", "")).strip().lower()
        return depot_to_porto.get(depot, "Le Havre")

    def guess_destino_porto(row):
        dest = str(row.get("destinataire", "")).strip().lower()
        return dest_to_porto.get(dest, "Rotterdam")

    def guess_container_tamanho(row):
        wt = pd.to_numeric(row.get("poids_net_total", np.nan), errors="coerce")
        if pd.isna(wt): 
            return "40ft"
        return "40ft" if wt >= 10000 else "20ft"

    out = pd.DataFrame()
    out["origem_porto"] = df.apply(guess_origem_porto, axis=1)
    out["destino_porto"] = df.apply(guess_destino_porto, axis=1)
    out["modal"] = "maritimo"

    # peso (kg) → toneladas
    out["volume_ton"] = pd.to_numeric(df.get("poids_net_total"), errors="coerce") / 1000.0

    # tipo de produto por 'article' (fallback para genérico)
    out["tipo_produto"] = df.get("article", "").astype(str).map(article_to_tipo).fillna("polpa_de_fruta")

    out["tipo_embalagem"] = "containerizado"
    out["container_tipo"] = "reefer"
    out["container_tamanho"] = df.apply(guess_container_tamanho, axis=1)

    # fatores operacionais (placeholders — você pode ajustar depois)
    out["fuel_index"] = 1.2

    # taxes_pct (aprox. a partir de frais_douane / px_achat_en, se existirem)
    if "frais_douane" in df.columns and "px_achat_en" in df.columns:
        den = pd.to_numeric(df["px_achat_en"], errors="coerce").clip(lower=1e-6)
        num = pd.to_numeric(df["frais_douane"], errors="coerce").fillna(0)
        out["taxes_pct"] = (100.0 * num / den).round(2)
    else:
        out["taxes_pct"] = 0.0

    # períodos e lead time
    if "date_intake" in df.columns:
        di = pd.to_datetime(df["date_intake"], errors="coerce")
        out["lead_time_days"] = 56     # heurística inicial
        ps, pe = zip(*di.map(month_bounds))
        out["period_start"] = ps
        out["period_end"] = pe
    else:
        out["lead_time_days"] = 56
        out["period_start"] = "2025/01/01"
        out["period_end"] = "2025/01/31"

    out["fx_brl_eur"] = 5.5
    out["model_name"] = "random_forest"
    out["output_currency"] = "EUR"

    # alvo (total em EUR, vindo do arquivo)
    if "couts" in df.columns:
        out["target_couts_eur"] = pd.to_numeric(df["couts"], errors="coerce")

    # descartar linhas sem alvo
    out = out.dropna(subset=["target_couts_eur"]).reset_index(drop=True)

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(out_csv, index=False)
    print(f"[OK] Gerado: {out_csv}  (linhas: {len(out)})")

def dump_uniques(input_xlsx: Path, sheet: str):
    """Utilitário: imprime valores únicos para ajudar a preencher os dicionários de mapeamento."""
    df = pd.read_excel(input_xlsx, sheet_name=sheet, header=1)
    df.columns = [norm(c) for c in df.columns]
    for col in ["depot", "destinataire", "article"]:
        if col in df.columns:
            vals = sorted({str(v).strip() for v in df[col].dropna().unique()})
            print(f"\nValores únicos em '{col}' ({len(vals)}):")
            for v in vals[:100]:
                print(" -", v)
            if len(vals) > 100:
                print(" ... (truncado)")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, default=Path("data/raw/STOCK_K2025.xlsx"))
    p.add_argument("--sheet", type=str, default="2025")
    p.add_argument("--out", type=Path, default=Path("data/datasets/dataset_api_alinhado_franca.csv"))
    p.add_argument("--dump-uniques", action="store_true", help="apenas listar valores únicos de depot/destinataire/article")
    args = p.parse_args()

    if args.dump_uniques:
        dump_uniques(args.input, args.sheet)
    else:
        build_dataset(args.input, args.sheet, args.out)
