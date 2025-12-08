'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface PredictionInput {
  origem: string;
  destino: string;
  modal: string;
  peso: number;
  data: string;
}

export default function ModelsPage() {
  const [input, setInput] = useState<PredictionInput>({
    origem: '',
    destino: '',
    modal: '',
    peso: 0,
    data: '',
  });
  const [resultado, setResultado] = useState<number | null>(null);

  const handlePredict = async () => {
    try {
      // TODO: Integrar com API de predição
      const custoEstimado = Math.random() * 10000; // Simulação
      setResultado(custoEstimado);
      toast({
        title: 'Sucesso',
        description: 'Predição realizada com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao realizar predição.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Testar Modelos</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Dados para Predição</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Origem</label>
              <Input
                value={input.origem}
                onChange={(e) => setInput({ ...input, origem: e.target.value })}
                placeholder="Cidade de origem"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destino</label>
              <Input
                value={input.destino}
                onChange={(e) => setInput({ ...input, destino: e.target.value })}
                placeholder="Cidade de destino"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modal</label>
              <Select
                value={input.modal}
                onValueChange={(value) => setInput({ ...input, modal: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rodoviario">Rodoviário</SelectItem>
                  <SelectItem value="maritimo">Marítimo</SelectItem>
                  <SelectItem value="aereo">Aéreo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Peso (kg)</label>
              <Input
                type="number"
                value={input.peso}
                onChange={(e) => setInput({ ...input, peso: Number(e.target.value) })}
                placeholder="Peso em kg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <Input
                type="date"
                value={input.data}
                onChange={(e) => setInput({ ...input, data: e.target.value })}
              />
            </div>

            <Button onClick={handlePredict} className="w-full">
              Realizar Predição
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Resultado</h2>
          
          {resultado !== null ? (
            <div className="space-y-4">
              <div className="text-2xl font-bold text-green-600">
                R$ {resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-gray-600">
                Este é o custo logístico estimado para a rota especificada.
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              Preencha os dados e clique em "Realizar Predição" para ver o resultado.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}