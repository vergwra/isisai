"use client";

import { useResultsStore } from "@/store/results-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModelComparisonChart } from "@/components/model-comparison-chart";
import { FileSpreadsheet, TrendingUp, Navigation, Truck } from "lucide-react";

export default function ResultsPage() {
  const results = useResultsStore((state) => state.results);

  const bestResult = results.reduce((best, current) => 
    current.acuracia > (best?.acuracia || 0) ? current : best
  , results[0]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExportCSV = () => {
    const headers = ['Modelo', 'Origem', 'Destino', 'Modal', 'Custo Estimado', 'Custo Real', 'Acurácia', 'Data'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        r.modelo,
        r.origem,
        r.destino,
        r.modal,
        r.custoEstimado,
        r.custoReal || '',
        (r.acuracia * 100).toFixed(2) + '%',
        r.data
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resultados_predicao.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Resultados</h1>
        <p className="text-gray-500 mt-2">
          Visualização dos resultados de predição de custos logísticos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Rota</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {bestResult.origem} → {bestResult.destino}
            </div>
            <p className="text-xs text-muted-foreground">
              Via {bestResult.modal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modal</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{bestResult.modal}</div>
            <p className="text-xs text-muted-foreground">
              Melhor opção de transporte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {formatCurrency(bestResult.custoEstimado)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsão mais precisa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Acurácia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {(bestResult.acuracia * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {bestResult.modelo}
            </p>
          </CardContent>
        </Card>
      </div>

      <ModelComparisonChart results={results} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalhes das Previsões</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Modal</TableHead>
                  <TableHead className="text-right">Custo Estimado</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead className="text-right">Acurácia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.modelo}</TableCell>
                    <TableCell>{result.origem} → {result.destino}</TableCell>
                    <TableCell>{result.modal}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(result.custoEstimado)}
                    </TableCell>
                    <TableCell className="text-right">
                      {result.custoReal ? formatCurrency(result.custoReal) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(result.acuracia * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
