import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const MAX_NOTE_DEPTH = 5;
export const VALID_NOTE_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
export const VALID_NOTE_DIRECTORY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type WalkedNote = { path:string; relative:string; name:string; depth:number };

const normalizeRelative=(value:string)=>value.split(sep).join("/");

export const walkMarkdownFiles=(root:string,maxDepth=MAX_NOTE_DEPTH):WalkedNote[]=>{
  const output:WalkedNote[]=[];
  const walk=(dir:string,depth:number)=>{
    if(depth>maxDepth)return;
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const absolute=join(dir,entry.name);
      if(entry.isDirectory()){ if(depth<maxDepth) walk(absolute,depth+1); continue; }
      if(!entry.isFile()||!entry.name.toLowerCase().endsWith(".md")) continue;
      output.push({path:absolute,relative:normalizeRelative(relative(root,absolute)),name:entry.name,depth});
    }
  };
  walk(root,1);
  return output;
};
