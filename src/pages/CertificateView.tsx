import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SEOHead } from "@/components/seo/SEOHead";
import { useRef, useCallback, useState } from "react";

export default function CertificateView() {
  const { certCode } = useParams<{ certCode: string }>();
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: cert, isLoading } = useQuery({
    queryKey: ["certificate", certCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates_public")
        .select("*, dialects(name), levels(name)")
        .eq("cert_code", certCode!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!certCode,
  });

  const dialectName = (cert?.dialects as any)?.name ?? "Unknown";
  const levelName = (cert?.levels as any)?.name ?? "Unknown";

  const handleDownload = useCallback(async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let drawWidth = pdfWidth;
      let drawHeight = pdfWidth / imgRatio;
      if (imgRatio < pdfRatio) {
        drawHeight = pdfHeight;
        drawWidth = pdfHeight * imgRatio;
      }

      const x = (pdfWidth - drawWidth) / 2;
      const y = (pdfHeight - drawHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, drawWidth, drawHeight);
      pdf.save(`ArabiyaPath-Certificate-${certCode}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setDownloading(false);
    }
  }, [certCode]);

  return (
    <Layout>
      <SEOHead
        title={cert ? `Certificate - ${dialectName} ${levelName}` : "Certificate Verification"}
        description="Verify an ArabiyaPath certificate of completion."
      />
      <div className="container max-w-2xl py-16 px-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-6 w-64 mx-auto" />
              <Skeleton className="h-6 w-40 mx-auto" />
            </CardContent>
          </Card>
        ) : !cert ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Certificate Not Found</h1>
              <p className="text-muted-foreground">
                The certificate code <span className="font-mono">{certCode}</span> could not be verified.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div
                ref={certRef}
                className="bg-gradient-to-br from-secondary/20 to-primary/20 p-8 sm:p-12 text-center space-y-6"
              >
                <Award className="w-16 h-16 text-secondary mx-auto" />
                <h1 className="text-2xl sm:text-3xl font-bold">Certificate of Completion</h1>
                <p className="text-muted-foreground">This certifies that</p>

                {(cert.first_name || cert.last_name) && (
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {[cert.first_name, cert.last_name].filter(Boolean).join(" ")}
                  </p>
                )}

                <p className="text-muted-foreground">has completed</p>

                <div className="space-y-1">
                  <p className="text-xl sm:text-2xl font-semibold text-foreground">{dialectName}</p>
                  <p className="text-lg text-muted-foreground">{levelName} Level</p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Issued on {format(new Date(cert.issued_at!), "MMMM d, yyyy")}
                </p>

                <p className="text-xs font-mono text-muted-foreground">
                  Certificate Code: {cert.cert_code}
                </p>

                <div className="inline-flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4" />
                  Verified Certificate
                </div>
              </div>
            </Card>

            <div className="flex justify-center">
              <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                <Download className="w-4 h-4" />
                {downloading ? "Generating PDF…" : "Download PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
