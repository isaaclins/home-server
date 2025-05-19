import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ResourceChart({ title, data, color, className }) {
  // data: [{ time, value }]
  const chartData = data.map((d) => ({
    ...d,
    time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));
  const current = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const max = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                axisLine={{ stroke: "#444" }}
                tickLine={{ stroke: "#444" }}
              />
              <YAxis 
                domain={[0, 100]} 
                tickCount={3} 
                tick={{ fontSize: 10 }}
                axisLine={{ stroke: "#444" }}
                tickLine={{ stroke: "#444" }}
                width={25}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(222.2 84% 4.9%)",
                  borderColor: "hsl(217.2 32.6% 17.5%)",
                  fontSize: "12px",
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={false}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Current: {current.toFixed(1)}%</span>
          <span>Max: {max.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
} 
