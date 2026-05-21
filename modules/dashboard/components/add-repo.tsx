"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDown, Github } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const AddRepo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleOpenRepository = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    try {
      // We'll create this API route in the next step
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to open repository. Please check the URL and ensure the repository is public.");
      }

      const playground = await response.json();

      toast.success("Repository opened successfully!");
      router.push(`/playground/${playground.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer transition-all duration-300 ease-in-out hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02] shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]">
            <div className="flex flex-row justify-center items-start gap-4">
              <Button
                variant={"outline"}
                className="flex justify-center items-center bg-white group-hover:bg-[#fff8f8] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
                size={"icon"}
              >
                <ArrowDown size={30} className="transition-transform duration-300 group-hover:translate-y-1" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-[#e93f3f]">Open Github Repository</h1>
                <p className="text-sm text-muted-foreground max-w-[220px]">Work with your repositories in our editor</p>
              </div>
            </div>
            <div className="relative overflow-hidden">
              <Image
                src={"/github.svg"}
                alt="Open GitHub repository"
                width={150}
                height={150}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" /> Open a GitHub Repository
            </DialogTitle>
            <DialogDescription>
              Enter the URL of a public GitHub repository to open it in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repo-url" className="text-right">
                Repo URL
              </Label>
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://github.com/owner/repo-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleOpenRepository}
              disabled={isLoading}
            >
              {isLoading ? "Opening..." : "Open Repository"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddRepo;