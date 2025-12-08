"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileSpreadsheet, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/store/data-store";
import { processFile } from "@/lib/file-processor";
import { DataPreviewTable } from "@/components/data-preview-table";
import { useDropzone } from "react-dropzone";

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const setData = useDataStore((state) => state.setData);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setError(null);
      setLoading(true);

      // Validar tamanho do arquivo (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. Tamanho máximo: 10MB");
      }

      // Validar tipo do arquivo
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error("Formato de arquivo inválido. Use CSV ou Excel");
      }

      const result = await processFile(file);
      setData(result.data, result.columns, file.name);

      // Redirecionar após 1.5s
      setTimeout(() => {
        router.push('/config');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    try {
      setError(null);
      setLoading(true);

      const response = await fetch(urlInput);
      const blob = await response.blob();
      const file = new File([blob], 'downloaded_file.csv', { type: 'text/csv' });
      
      await onDrop([file]);
    } catch (err) {
      setError('Erro ao carregar arquivo da URL');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload de Dados</h1>
        <p className="text-gray-500 mt-2">
          Importe seus dados logísticos para análise
        </p>
      </div>

      <Tabs defaultValue="file" className="space-y-4">
        <TabsList>
          <TabsTrigger value="file">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Arquivo
          </TabsTrigger>
          <TabsTrigger value="url">
            <LinkIcon className="h-4 w-4 mr-2" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Arquivo</CardTitle>
              <CardDescription>
                Arraste e solte um arquivo CSV ou Excel, ou clique para selecionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-10 w-10 text-gray-400" />
                  {isDragActive ? (
                    <p>Solte o arquivo aqui...</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Arraste e solte um arquivo aqui, ou clique para selecionar
                      </p>
                      <Button variant="secondary" size="sm">
                        Selecionar Arquivo
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle>Importar por URL</CardTitle>
              <CardDescription>
                Cole a URL de um arquivo CSV ou Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com/dados.csv"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button onClick={handleUrlSubmit} disabled={loading}>
                  Importar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data.length > 0 && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização dos Dados</CardTitle>
            <CardDescription>
              Mostrando as 5 primeiras linhas do arquivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataPreviewTable data={data} columns={columns} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Requisitos do Arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Formatos aceitos: CSV (.csv) ou Excel (.xlsx, .xls)</li>
            <li>Tamanho máximo: 10MB</li>
            <li>Colunas obrigatórias: data, origem, destino, modal, peso, valor</li>
            <li>Datas no formato DD/MM/AAAA</li>
            <li>Valores numéricos usando ponto (.) como separador decimal</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
