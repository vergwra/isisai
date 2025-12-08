"use client";

import { useNormalizationStore, DataType } from "@/store/normalization-store";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Star,
  ArrowRight,
  Wand2,
  AlertCircle,
} from "lucide-react";

export default function NormalizePage() {
  const { columns, toggleColumnSelection, updateColumnType, autoNormalize } =
    useNormalizationStore();
  const router = useRouter();

  const handleAdvance = () => {
    const selectedColumns = columns.filter((col) => col.isSelected);
    if (selectedColumns.length < 3) {
      alert("Selecione pelo menos 3 variáveis para continuar");
      return;
    }
    router.push("/config");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Normalização de Dados</h1>
        <p className="text-gray-500 mt-2">
          Revise e ajuste as variáveis para o modelo preditivo
        </p>
      </div>

      <div className="flex justify-between items-center">
        <Alert className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione as variáveis relevantes para o modelo. Variáveis com ícone{" "}
            <Star className="h-4 w-4 inline text-yellow-500" /> são recomendadas
            automaticamente.
          </AlertDescription>
        </Alert>

        <Button onClick={autoNormalize} variant="outline">
          <Wand2 className="mr-2 h-4 w-4" />
          Normalizar Automaticamente
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Usar</TableHead>
              <TableHead>Nome da Coluna</TableHead>
              <TableHead>Tipo de Dado</TableHead>
              <TableHead className="text-right">Valores Nulos</TableHead>
              <TableHead>Exemplo</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((column) => (
              <TableRow key={column.name}>
                <TableCell>
                  <Checkbox
                    checked={column.isSelected}
                    onCheckedChange={() => toggleColumnSelection(column.name)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {column.name}
                  {column.isRecommended && (
                    <Star className="h-4 w-4 inline ml-2 text-yellow-500" />
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={column.dataType}
                    onValueChange={(value: DataType) =>
                      updateColumnType(column.name, value)
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numeric">Numérico</SelectItem>
                      <SelectItem value="categorical">Categórico</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`${
                      column.nullPercentage > 30
                        ? "text-red-500"
                        : column.nullPercentage > 10
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {column.nullPercentage}%
                  </span>
                </TableCell>
                <TableCell>{column.example}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {column.hasOutliers && (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Outliers
                      </Badge>
                    )}
                    {column.nullPercentage > 30 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Nulos
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleAdvance} size="lg">
          Avançar para Treinamento
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
