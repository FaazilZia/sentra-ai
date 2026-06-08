import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link as LinkIcon, 
  Highlighter, 
  Undo, 
  Redo 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface RichPolicyEditorProps {
  content: string;           // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function RichPolicyEditor({ content, onChange, placeholder = 'Write policy details...', readOnly = false }: RichPolicyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {},
        orderedList: {},
        listItem: {}
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-400 underline hover:text-indigo-300',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextStyle,
      Color,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync content updates
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col w-full border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/20">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1 p-2 bg-[var(--bg-card)] border-b border-zinc-800/80 items-center justify-between">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Formatting */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('bold') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('italic') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('underline') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('strike') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Strikethrough className="h-4 w-4" />
            </button>

            <span className="w-px h-4 bg-zinc-800 mx-1" />

            {/* Headings */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn("p-1.5 rounded transition", editor.isActive('heading', { level: 1 }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("p-1.5 rounded transition", editor.isActive('heading', { level: 2 }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn("p-1.5 rounded transition", editor.isActive('heading', { level: 3 }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Heading3 className="h-4 w-4" />
            </button>

            <span className="w-px h-4 bg-zinc-800 mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('bulletList') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('orderedList') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={cn("p-1.5 rounded transition", editor.isActive('taskList') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <CheckSquare className="h-4 w-4" />
            </button>

            <span className="w-px h-4 bg-zinc-800 mx-1" />

            {/* Alignment */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={cn("p-1.5 rounded transition", editor.isActive({ textAlign: 'left' }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={cn("p-1.5 rounded transition", editor.isActive({ textAlign: 'center' }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={cn("p-1.5 rounded transition", editor.isActive({ textAlign: 'right' }) ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <AlignRight className="h-4 w-4" />
            </button>

            <span className="w-px h-4 bg-zinc-800 mx-1" />

            {/* Link & Highlight */}
            <button
              type="button"
              onClick={setLink}
              className={cn("p-1.5 rounded transition", editor.isActive('link') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#4f46e5' }).run()}
              className={cn("p-1.5 rounded transition", editor.isActive('highlight') ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white")}
            >
              <Highlighter className="h-4 w-4" />
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="p-4 min-h-[200px] text-xs text-gray-300 prose prose-invert max-w-none focus:outline-none">
        <EditorContent editor={editor} className="outline-none" />
      </div>

      {/* Character Count */}
      <div className="bg-zinc-950/40 p-2 border-t border-zinc-900/60 flex justify-end">
        <span className="text-[10px] text-gray-500 font-mono">
          {editor.storage.characterCount.characters()} characters
        </span>
      </div>
    </div>
  );
}
