"use client";

import { useState, useMemo } from "react";
import { useDataPreviewStore, Column, DataRow } from "@/store/data-preview-store";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronDown,
  Trash2,
  Edit2,
  ArrowRight,
  BarChart2,
} from "lucide-react";

export default function PreviewPage() {
  const { columns, data, updateCell, deleteRow, deleteColumn, calculateStats } =
    useDataPreviewStore();
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  

  // Formata o valor baseado no tipo da coluna
  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "-";
    if (type === "numeric") return Number(value).toLocaleString("pt-BR");
    if (type === "date")
      return new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    return value;
  };

  const tableColumns = useMemo<ColumnDef<DataRow>[]>(
    () =>
      columns.map((column) => ({
        accessorKey: column.id,
        header: ({ column: tableColumn }) => {
          return (
            <div className="flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                  >
                    <span>{column.name}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => {
                      calculateStats(column.id);
                      setSelectedColumn(column);
                    }}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Ver Estatísticas
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteColumn(column.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Coluna
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tableColumn.toggleSorting()}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        cell: ({ row, getValue }) => {
          const value = getValue();
          const [editing, setEditing] = useState(false);
          const [editValue, setEditValue] = useState(String(value ?? ''));

          if (editing) {
            return (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                    const convertedValue = column.type === 'numeric' 
                    ? Number(editValue) 
                    : editValue;
                  updateCell(row.original.id, column.id, convertedValue);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        const convertedValue = column.type === 'numeric' 
                          ? Number(editValue) 
                          : editValue;
                        updateCell(row.original.id, column.id, convertedValue);
                        setEditing(false);
                      }
                }}
                className="h-8 w-[150px]"
              />
            );
          }

          return (
            <div className="flex items-center gap-2">
              <span>{formatValue(value, column.type)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          );
        },
      })),
    [columns]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const formatStat = (value: number) => {
    return Number(value).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Visualização dos Dados</h1>
        <p className="text-gray-500 mt-2">
          Revise e ajuste os dados antes de prosseguir
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.slice(0, 50).map((row) => (
              <TableRow key={row.id} className="group">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRow(row.original.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedColumn} onOpenChange={() => setSelectedColumn(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Estatísticas: {selectedColumn?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedColumn && (
            <div className="grid gap-4 py-4">
              {selectedColumn.type === "numeric" ? (
                <>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <div className="font-medium">Média</div>
                    <div>{formatStat(selectedColumn.stats.mean!)}</div>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <div className="font-medium">Mediana</div>
                    <div>{formatStat(selectedColumn.stats.median!)}</div>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <div className="font-medium">Desvio Padrão</div>
                    <div>{formatStat(selectedColumn.stats.stdDev!)}</div>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <div className="font-medium">Mínimo</div>
                    <div>{formatStat(selectedColumn.stats.min!)}</div>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <div className="font-medium">Máximo</div>
                    <div>{formatStat(selectedColumn.stats.max!)}</div>
                  </div>
                </>
              ) : null}
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Valores Únicos</div>
                <div>{selectedColumn.stats.uniqueCount}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Valores Nulos</div>
                <div>{selectedColumn.stats.nullCount}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Moda</div>
                <div>{selectedColumn.stats.mode}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button onClick={() => router.push("/normalize")} size="lg">
          Prosseguir para Normalização
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
