import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-4">Page not found</p>
      <Button variant="ghost" size="sm" onClick={() => window.location.href = "/"}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Go home
      </Button>
    </div>
  );
}
