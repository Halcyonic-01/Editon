import { type NextRequest, NextResponse } from "next/server";

interface CodeSuggestionRequest {
    fileContent: string
    cursorLine: number
    cursorColumn: number
    suggestionType: string
    fileName?: string
}

interface CodeContext {
    language: string
    framework: string
    beforeContext: string
    currentLine: string
    afterContext: string
    cursorPosition: { line: number; column: number }
    isInFunction: boolean
    isInClass: boolean
    isAfterComment: boolean
    incompletePatterns: string[]
    fullContentBefore: string // Added for FIM
    fullContentAfter: string  // Added for FIM
}

export async function POST(request: NextRequest) {
    try {
        const body: CodeSuggestionRequest = await request.json()
        const { fileContent, cursorLine, cursorColumn, suggestionType, fileName } = body

        // Validate input
        if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
            return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 })
        }

        // Analyze code context
        const context = analyzeCodeContext(fileContent, cursorLine, cursorColumn, fileName)

        // Build AI prompt using Qwen FIM (Fill-In-the-Middle) format
        const prompt = buildFIMPrompt(context)

        // Call AI service
        const suggestion = await generateSuggestion(prompt)

        return NextResponse.json({
            suggestion,
            context,
            metadata: {
                language: context.language,
                framework: context.framework,
                position: context.cursorPosition,
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error: any) {
        console.error("Context analysis error:", error)
        return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
    }
}


/**
 * Analyze the code context around the cursor position
 */
function analyzeCodeContext(content: string, line: number, column: number, fileName?: string): CodeContext {
    const lines = content.split("\n")
    const currentLine = lines[line] || ""
  
    // Split content exactly at cursor position for FIM
    let charCount = 0;
    for(let i=0; i<line; i++) {
        charCount += lines[i].length + 1; // +1 for newline
    }
    charCount += column;

    const fullContentBefore = content.substring(0, charCount);
    const fullContentAfter = content.substring(charCount);

    // Get surrounding context (10 lines before and after) for Metadata only
    const contextRadius = 10
    const startLine = Math.max(0, line - contextRadius)
    const endLine = Math.min(lines.length, line + contextRadius)
  
    const beforeContext = lines.slice(startLine, line).join("\n")
    const afterContext = lines.slice(line + 1, endLine).join("\n")
  
    // Detect language and framework
    const language = detectLanguage(content, fileName)
    const framework = detectFramework(content)
  
    // Analyze code patterns
    const isInFunction = detectInFunction(lines, line)
    const isInClass = detectInClass(lines, line)
    const isAfterComment = detectAfterComment(currentLine, column)
    const incompletePatterns = detectIncompletePatterns(currentLine, column)
  
    return {
      language,
      framework,
      beforeContext,
      currentLine,
      afterContext,
      cursorPosition: { line, column },
      isInFunction,
      isInClass,
      isAfterComment,
      incompletePatterns,
      fullContentBefore,
      fullContentAfter
    }
  }
  
  /**
   * Build Prompt using Qwen/Starcoder FIM format
   * <|fim_prefix|> content_before <|fim_suffix|> content_after <|fim_middle|>
   */
  function buildFIMPrompt(context: CodeContext): string {
    // We trim specific markers to ensure the model connects smoothly
    // Qwen 2.5 Coder works best with this specific format
    return `<|fim_prefix|>${context.fullContentBefore}<|fim_suffix|>${context.fullContentAfter}<|fim_middle|>`
  }
  
  /**
   * Generate suggestion using AI service
   */
  async function generateSuggestion(prompt: string): Promise<string> {
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-coder:7b",
          prompt, // Sending the FIM formatted string
          stream: false,
          options: {
            temperature: 0.2, // Lower temperature for code completion to be more deterministic
            num_predict: 50,  // Suggest short, concise completions (lines or blocks)
            stop: ["<|file_separator|>", "\n\n\n"], // Stop tokens to prevent hallucinations
          },
          // Raw mode is often required for FIM to prevent Ollama from adding its own formatting
          raw: true 
        }),
      })
  
      if (!response.ok) {
        const errorBody = await response.text(); 
        throw new Error(`AI service error: ${response.statusText} - ${errorBody}`)
      }
  
      const data = await response.json()
      let suggestion = data.response
  
      // Clean up if the model outputs markdown blocks despite raw mode
      if (suggestion.includes("```")) {
        const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/)
        suggestion = codeMatch ? codeMatch[1] : suggestion
      }
  
      return suggestion
    } catch (error) {
      console.error("AI generation error:", error)
      return "" // Return empty string on error so editor doesn't break
    }
  }
  
  // Helper functions for code analysis
  function detectLanguage(content: string, fileName?: string): string {
    if (fileName) {
      const ext = fileName.split(".").pop()?.toLowerCase()
      const extMap: Record<string, string> = {
        ts: "TypeScript",
        tsx: "TypeScript",
        js: "JavaScript",
        jsx: "JavaScript",
        py: "Python",
        java: "Java",
        go: "Go",
        rs: "Rust",
        php: "PHP",
        css: "CSS",
        html: "HTML"
      }
      if (ext && extMap[ext]) return extMap[ext]
    }
  
    // Content-based detection fallback
    if (content.includes("interface ") || content.includes(": string")) return "TypeScript"
    if (content.includes("def ") || content.includes("import ")) return "Python"
    if (content.includes("func ") || content.includes("package ")) return "Go"
  
    return "JavaScript"
  }
  
  function detectFramework(content: string): string {
    if (content.includes("import React") || content.includes("useState")) return "React"
    if (content.includes("import Vue") || content.includes("<template>")) return "Vue"
    if (content.includes("@angular/") || content.includes("@Component")) return "Angular"
    if (content.includes("next/") || content.includes("getServerSideProps")) return "Next.js"
  
    return "None"
  }
  
  function detectInFunction(lines: string[], currentLine: number): boolean {
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i]
      if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/)) return true
      if (line?.match(/^\s*}/)) break
    }
    return false
  }
  
  function detectInClass(lines: string[], currentLine: number): boolean {
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i]
      if (line?.match(/^\s*(class|interface)\s+/)) return true
    }
    return false
  }
  
  function detectAfterComment(line: string, column: number): boolean {
    const beforeCursor = line.substring(0, column)
    return /\/\/.*$/.test(beforeCursor) || /#.*$/.test(beforeCursor)
  }
  
  function detectIncompletePatterns(line: string, column: number): string[] {
    const beforeCursor = line.substring(0, column)
    const patterns: string[] = []
  
    if (/^\s*(if|while|for)\s*\($/.test(beforeCursor.trim())) patterns.push("conditional")
    if (/^\s*(function|def)\s*$/.test(beforeCursor.trim())) patterns.push("function")
    if (/\{\s*$/.test(beforeCursor)) patterns.push("object")
    if (/\[\s*$/.test(beforeCursor)) patterns.push("array")
    if (/=\s*$/.test(beforeCursor)) patterns.push("assignment")
    if (/\.\s*$/.test(beforeCursor)) patterns.push("method-call")
  
    return patterns
  }