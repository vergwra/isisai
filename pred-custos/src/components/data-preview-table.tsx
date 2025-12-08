import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataRow } from "@/store/data-store";

interface DataPreviewTableProps {
  data: DataRow[];
  columns: string[];
}

export function DataPreviewTable({ data, columns }: DataPreviewTableProps) {
  const previewData = data.slice(0, 5);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewData.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={`${index}-${column}`}>
                  {row[column]?.toString() || ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
