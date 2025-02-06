import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import * as ts from 'typescript';

interface ImportIssue {
  file: string;
  line: number;
  message: string;
}

const ROOT_DIR = resolve(__dirname, '..');
const SRC_DIR = join(ROOT_DIR, 'src');

const ALLOWED_IMPORT_PATTERNS = {
  '@/*': 'src/*',
  '@components/*': 'src/components/*',
  '@features/*': 'src/features/*',
  '@lib/*': 'src/lib/*',
  '@store/*': 'src/store/*',
  '@types/*': 'src/types/*',
  '@utils/*': 'src/utils/*',
  '@assets/*': 'src/assets/*',
};

const PATH_RESTRICTIONS = [
  {
    target: 'src/components/ui',
    from: 'src/features',
    message: 'UI components cannot import from feature components',
  },
  {
    target: 'src/components/common',
    from: 'src/features',
    message: 'Common components cannot import from feature components',
  },
  {
    target: 'src/lib',
    from: 'src/features',
    message: 'Library code cannot import from feature components',
  },
];

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function validateImports(sourceFile: ts.SourceFile): ImportIssue[] {
  const issues: ImportIssue[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
      const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      
      // Check for relative imports that could use path aliases
      if (importPath.startsWith('../')) {
        issues.push({
          file: sourceFile.fileName,
          line: lineNumber,
          message: `Consider using path aliases instead of relative import: ${importPath}`,
        });
      }
      
      // Check path restrictions
      const normalizedSourcePath = sourceFile.fileName.replace(ROOT_DIR, '').replace(/\\/g, '/');
      for (const restriction of PATH_RESTRICTIONS) {
        if (
          normalizedSourcePath.includes(restriction.target) &&
          importPath.includes(restriction.from)
        ) {
          issues.push({
            file: sourceFile.fileName,
            line: lineNumber,
            message: restriction.message,
          });
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return issues;
}

function main() {
  const files = getAllTypeScriptFiles(SRC_DIR);
  const program = ts.createProgram(files, {});
  let hasIssues = false;
  
  for (const file of files) {
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) continue;
    
    const issues = validateImports(sourceFile);
    if (issues.length > 0) {
      hasIssues = true;
      console.log(`\nIssues in ${file.replace(ROOT_DIR, '')}:`);
      for (const issue of issues) {
        console.log(`  Line ${issue.line}: ${issue.message}`);
      }
    }
  }
  
  if (hasIssues) {
    process.exit(1);
  } else {
    console.log('No import issues found!');
  }
}

main();
