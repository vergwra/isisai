import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PredictionResult } from "@/store/results-store";

interface ModelComparisonChartProps {
  results: PredictionResult[];
}

export function ModelComparisonChart({ results }: ModelComparisonChartProps) {
  // Agrupa resultados por modelo e calcula média de acurácia
  const chartData = Object.entries(
    results.reduce((acc, curr) => {
      if (!acc[curr.modelo]) {
        acc[curr.modelo] = {
          modelo: curr.modelo,
          acuracia: curr.acuracia,
          count: 1,
        };
      } else {
        acc[curr.modelo].acuracia += curr.acuracia;
        acc[curr.modelo].count += 1;
      }
      return acc;
    }, {} as Record<string, { modelo: string; acuracia: number; count: number }>)
  ).map(([_, value]) => ({
    modelo: value.modelo,
    acuracia: (value.acuracia / value.count) * 100, // Convertendo para percentual
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Comparação de Modelos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="modelo" />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, "Acurácia"]}
              />
              <Bar
                dataKey="acuracia"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
