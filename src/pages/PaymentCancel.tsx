import { Link } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  return (
    <FocusLayout>
      <div className="container max-w-lg py-20">
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
            <p className="text-muted-foreground">
              Your payment was cancelled. No charges were made to your account.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link to="/pricing">Back to Pricing</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FocusLayout>
  );
}
