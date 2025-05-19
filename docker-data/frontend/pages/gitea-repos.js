import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = "http://localhost:3002/api";
const GITEA_WEB_URL = "http://localhost:3003";

export default function GiteaReposPage() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/gitea/public-repos`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch repositories");
        }
        const data = await res.json();
        setRepos(data);
      } catch (err) {
        setError(err.message || "Failed to fetch repositories");
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Public Git Repositories</CardTitle>
            <CardDescription>
              Browse all public repositories hosted on this server's Gitea
              instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading repositories...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && repos.length === 0 && (
              <p className="text-muted-foreground">
                No public repositories found.
              </p>
            )}
            <div className="space-y-4 mt-4">
              {repos.map((repo) => (
                <Card key={repo.id} className="border border-gray-200">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          {repo.full_name}
                        </CardTitle>
                        <CardDescription>
                          {repo.description || (
                            <span className="italic text-muted-foreground">
                              No description
                            </span>
                          )}
                        </CardDescription>
                        <div className="text-xs text-muted-foreground mt-1">
                          Owner:{" "}
                          {repo.owner?.login ||
                            repo.owner?.username ||
                            "unknown"}
                        </div>
                      </div>
                      <a
                        href={`${GITEA_WEB_URL}/${repo.full_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline">View on Gitea</Button>
                      </a>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
