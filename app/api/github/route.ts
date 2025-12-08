import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { TemplateFolder, TemplateFile } from "@/modules/playground/lib/path-to-json";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

// Helper to check if file is likely binary
function isBinaryFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'mp3', 'wav', 'pdf', 'zip', 'tar', 'gz'];
    return binaryExts.includes(ext);
}

async function fetchRepoContents(owner: string, repo: string, path: string = ""): Promise<(TemplateFile | TemplateFolder)[]> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });

    if (!Array.isArray(data)) return [];

    const contents: (TemplateFile | TemplateFolder)[] = [];

    for (const item of data) {
      if (item.type === "file") {
        if (isBinaryFile(item.name)) continue; // Skip binaries

        let content = "";
        
        // 1. Try standard content
        if (item.content) {
             // @ts-ignore
            content = Buffer.from(item.content, "base64").toString("utf-8");
        } 
        // 2. Try fetching blob (for files 1MB-100MB)
        else if (item.sha) {
            try {
                const { data: blobData } = await octokit.git.getBlob({
                    owner, repo, file_sha: item.sha,
                });
                content = Buffer.from(blobData.content, "base64").toString("utf-8");
            } catch (blobError) {
                console.warn(`Skipping large/binary file: ${item.path}`);
                continue; 
            }
        }
        
        // 3. Last check: Ensure package.json is valid if we found one
        if (item.name === "package.json") {
             try {
                 JSON.parse(content); // Validate JSON
             } catch (e) {
                 console.error("Invalid package.json found, skipping to avoid crash");
                 continue;
             }
        }

        contents.push({
          filename: item.name.split(".").slice(0, -1).join("."), // filename without ext
          fileExtension: item.name.split(".").pop() || "",
          content,
        });

      } else if (item.type === "dir") {
        contents.push({
          folderName: item.name,
          items: await fetchRepoContents(owner, repo, item.path),
        });
      }
    }

    return contents;
  } catch (error) {
    console.error(`Error fetching path ${path}:`, error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoUrl } = await req.json();
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });

    const items = await fetchRepoContents(repoInfo.owner, repoInfo.repo);

    // Validate we actually got content
    if (items.length === 0) {
        return NextResponse.json({ error: "Repository is empty or inaccessible" }, { status: 400 });
    }

    const templateData: TemplateFolder = { folderName: repoInfo.repo, items };

    const newPlayground = await db.playground.create({
      data: {
        title: repoInfo.repo,
        description: `GitHub: ${repoInfo.owner}/${repoInfo.repo}`,
        template: "GITHUB",
        userId: user.id,
        TemplateFile: { create: { content: JSON.stringify(templateData) } },
      },
    });

    return NextResponse.json(newPlayground);
  } catch (error) {
    console.error("GitHub Import Error:", error);
    return NextResponse.json({ error: "Failed to import repository" }, { status: 500 });
  }
}