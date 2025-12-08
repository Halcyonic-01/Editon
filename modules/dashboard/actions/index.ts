"use server"

import { db } from "@/lib/db"
import { currentUser } from "@/modules/auth/actions"
import { revalidatePath } from "next/cache"
import { templatePaths } from "@/lib/template"
import { scanTemplateDirectory } from "@/modules/playground/lib/path-to-json"
import path from "path"

export const toggleStarMarked = async (playgroundId: string, isChecked: boolean) => {
    const user = await currentUser();
    const userId = user?.id;
  
    if (!userId) {
      throw new Error("User Id is required");
    }
  
    try {
      if (isChecked) {
        await db.starMark.create({
          data: {
            userId,
            playgroundId,
            isMarked: isChecked,
          },
        });
  
        revalidatePath("/dashboard");
        return { success: true, isMarked: isChecked, error: null };
      } else {
        await db.starMark.delete({
          where: {
            userId_playgroundId: {
              userId,
              playgroundId,
            },
          },
        });
  
        revalidatePath("/dashboard");
        return { success: true, isMarked: isChecked, error: null };
      }
    } catch (error) {
      console.error("Error updating problem:", error);
      return {
        success: false,
        isMarked: !isChecked,
        error: "Failed to update problem",
      };
    }
  };
  

export const getAllPlaygroundForUser = async () => {
    const user = await currentUser()

    try {
        const playground = await db.playground.findMany({
            where: {
                userId: user?.id
            },
            include: {
                user: true,
                Starmark:{
                    where:{
                        userId:user?.id!
                    },
                    select:{
                        isMarked:true
                    }
                }
            }
        })
        return playground
    } catch (error) {
        console.log(error)
    }
}

export const createPlayground = async (data: {
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string
}) => {
    const user = await currentUser()

    const { template, description, title } = data

    try {
        // 1. Get the path for the selected template
        const templatePathKey = template as keyof typeof templatePaths
        const relativePath = templatePaths[templatePathKey]

        if (!relativePath) {
            throw new Error("Invalid template selected")
        }

        // 2. Scan the template directory to get file content
        const fullPath = path.join(process.cwd(), relativePath)
        const templateContent = await scanTemplateDirectory(fullPath)

        // 3. Create Playground AND TemplateFile in the database
        const playground = await db.playground.create({
            data: {
                title: title,
                description: description,
                template: template,
                userId: user?.id!,
                TemplateFile: {
                    create: {
                        content: JSON.stringify(templateContent)
                    }
                }
            }
        })
        return playground
    } catch (error) {
        console.log(error)
    }
}

export const deleteProjectById = async (id: string) => {
    try {
        await db.playground.delete({
            where: {
                id
            }
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}

export const editProjectById = async (id: string, data: { title: string, description: string }) => {
    try {
        await db.playground.update({
            where: {
                id
            },
            data: data
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}

export const duplicateProjectById = async (id: string) => {
    try {
        const user = await currentUser()
        if (!user) return

        // Fetch original project WITH its template file content
        const originalPlayground = await db.playground.findUnique({
            where: {
                id
            },
            include: {
                TemplateFile: true
            }
        })
        
        if (!originalPlayground) {
            throw new Error("Original Playground not found")
        }

        // Determine content: try DB first, fallback to disk if empty (for older projects)
        let content = originalPlayground.TemplateFile?.content

        if (!content) {
            const templatePathKey = originalPlayground.template as keyof typeof templatePaths
            const relativePath = templatePaths[templatePathKey]
            if (relativePath) {
                const fullPath = path.join(process.cwd(), relativePath)
                const templateData = await scanTemplateDirectory(fullPath)
                content = JSON.stringify(templateData)
            }
        }

        if (!user.id) {
            throw new Error("User ID is required");
        }

        const duplicatedPlayground = await db.playground.create({
            data: {
                title: `${originalPlayground.title} (Copy)`,
                description: originalPlayground.description,
                template: originalPlayground.template,
                userId: user.id, // Assign to current user
                TemplateFile: {
                    create: {
                        content: content ?? JSON.stringify({ folderName: "root", items: [] })
                    }
                }
            }
        })
        revalidatePath("/dashboard")
        return duplicatedPlayground
    } catch (error) {
        console.log(error)
    }
}