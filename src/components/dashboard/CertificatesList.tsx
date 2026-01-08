import { Link } from "react-router-dom";
import { Award, Download, Share2, ExternalLink, Linkedin, Twitter, Facebook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Certificate } from "@/hooks/useDashboardData";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CertificatesListProps {
  certificates: Certificate[];
}

export function CertificatesList({ certificates }: CertificatesListProps) {
  const handleShare = (platform: string, cert: Certificate) => {
    const certUrl = `${window.location.origin}/certificate/${cert.certCode}`;
    const text = `I just completed the ${cert.levelName} level in ${cert.dialectName} at ArabiyaPath! 🎓`;
    
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(certUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certUrl)}`,
    };
    
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  if (certificates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-secondary" />
            </div>
            <p className="text-muted-foreground mb-2">
              No certificates yet
            </p>
            <p className="text-sm text-muted-foreground">
              Complete all units in a level to earn your certificate!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-secondary" />
          Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {cert.dialectName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {cert.levelName} Level
                  </p>
                </div>
                <Award className="w-8 h-8 text-secondary" />
              </div>
              
              <p className="text-xs text-muted-foreground mb-4">
                Issued on {format(new Date(cert.issuedAt), "MMMM d, yyyy")}
              </p>

              <div className="flex flex-wrap gap-2">
                <Link to={`/certificate/${cert.certCode}`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    <ExternalLink className="w-3 h-3" />
                    View
                  </Button>
                </Link>
                
                <Button size="sm" variant="outline" className="gap-1">
                  <Download className="w-3 h-3" />
                  Download
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="gap-1">
                      <Share2 className="w-3 h-3" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare("linkedin", cert)}>
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare("twitter", cert)}>
                      <Twitter className="w-4 h-4 mr-2" />
                      X (Twitter)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare("facebook", cert)}>
                      <Facebook className="w-4 h-4 mr-2" />
                      Facebook
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
