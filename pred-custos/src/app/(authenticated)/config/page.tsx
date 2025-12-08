import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração do Modelo</h1>
        <p className="text-gray-500 mt-2">
          Selecione as variáveis e parâmetros para a análise
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Variáveis de Entrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modal de Transporte</Label>
              <RadioGroup defaultValue="all">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">Todos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maritime" id="maritime" />
                  <Label htmlFor="maritime">Marítimo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="air" id="air" />
                  <Label htmlFor="air">Aéreo</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Período de Análise</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Último mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1y">Último ano</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Modelo</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Regressão Linear</SelectItem>
                  <SelectItem value="rf">Random Forest</SelectItem>
                  <SelectItem value="xgb">XGBoost</SelectItem>
                  <SelectItem value="lstm">LSTM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Métrica de Avaliação</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rmse">RMSE</SelectItem>
                  <SelectItem value="mae">MAE</SelectItem>
                  <SelectItem value="mape">MAPE</SelectItem>
                  <SelectItem value="r2">R²</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline">Limpar</Button>
        <Button>Treinar Modelo</Button>
      </div>
    </div>
  );
}
