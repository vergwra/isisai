import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { HistoricalPrediction } from "@/store/dashboard-store";

interface HistoricalChartProps {
  data: HistoricalPrediction[];
}

export function HistoricalChart({ data }: HistoricalChartProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calcula a tendência (último valor - primeiro valor)
  const trend = data[data.length - 1].custoEstimado - data[0].custoEstimado;
  const trendPercentage = ((trend / data[0].custoEstimado) * 100).toFixed(1);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Histórico de Previsões</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tendência:</span>
            <span className={`text-sm font-medium ${trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(Number(trendPercentage))}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="data"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Custo Estimado"]}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Area
                type="monotone"
                dataKey="custoEstimado"
                stroke="#2563eb"
                fill="url(#colorCusto)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
