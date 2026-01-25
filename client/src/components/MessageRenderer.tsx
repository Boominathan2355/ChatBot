import React from 'react';
import { Box, Typography, Link, styled } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MessageRendererProps {
    content: string;
    role: 'user' | 'assistant' | 'system';
    resolvedMode?: any; // Using any to bypass complex type imports for now, or use ResolvedMode if imported
}

// Styled components for markdown elements
const MarkdownContainer = styled(Box)(() => ({
    '& p': {
        margin: '0.5rem 0',
        lineHeight: 1.7,
    },
    '& p:first-of-type': {
        marginTop: 0,
    },
    '& p:last-of-type': {
        marginBottom: 0,
    },
    '& ul, & ol': {
        margin: '0.5rem 0',
        paddingLeft: '1.5rem',
    },
    '& li': {
        marginBottom: '0.25rem',
        lineHeight: 1.6,
    },
    '& h1, & h2, & h3, & h4': {
        margin: '1rem 0 0.5rem 0',
        fontWeight: 600,
    },
    '& h1': { fontSize: '1.5rem' },
    '& h2': { fontSize: '1.25rem' },
    '& h3': { fontSize: '1.1rem' },
    '& blockquote': {
        margin: '0.5rem 0',
        padding: '0.5rem 1rem',
        borderLeft: `3px solid rgba(255, 255, 255, 0.2)`,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0 8px 8px 0',
    },
    '& hr': {
        margin: '1rem 0',
        border: 'none',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    },
    '& table': {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '0.5rem 0',
    },
    '& th, & td': {
        padding: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'left',
    },
    '& th': {
        background: 'rgba(255, 255, 255, 0.05)',
        fontWeight: 600,
    },
}));

const InlineCode = styled('code')(() => ({
    background: 'rgba(150, 150, 150, 0.2)',
    padding: '2px 6px',
    borderRadius: 6,
    fontSize: '0.85em',
    fontFamily: '"Fira Code", "Consolas", monospace',
    color: 'inherit',
    border: '1px solid rgba(255,255,255,0.1)'
}));

const StyledLink = styled(Link)(({ theme }) => ({
    color: 'inherit',
    textDecoration: 'underline',
    textDecorationColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    '&:hover': {
        textDecoration: 'none',
    },
}));

const Citation = styled('span')(() => ({
    verticalAlign: 'super',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'inherit',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0 4px',
    borderRadius: '4px',
    marginLeft: '2px',
    cursor: 'default',
    userSelect: 'none',
    opacity: 0.7
}));

import ThinkingBlock from './ThinkingBlock';
// ... (keep styled components)

const MessageRenderer: React.FC<MessageRendererProps> = React.memo(({ content, resolvedMode }) => {
    // Determine the resolved theme mode for ThinkingBlock
    // Since MessageRenderer might not have direct access to resolvedMode prop, 
    // we use a hook or assume context. If useResolvedMode isn't available, 
    // we can default to system or modify prop to pass it down. 
    // For now, let's assume we can simple pass a prop or use a hook if it existed.
    // Instead of adding a complex hook dependency, let's stick to standard MUI theme.

    // HOWEVER, MessageRenderer usually needs 'resolvedMode' passed from parent if we want consistency with other components.
    // Looking at MessageBubble, it doesn't pass resolvedMode to MessageRenderer currently.
    // Let's modify MessageRenderer props to accept resolvedMode or infer it.
    // Since we don't want to break existing usage, we'll try to extract "think" block first.

    // Handle both complete and incomplete (streaming) think blocks
    // Use regex to capture case-insensitive <think> tags, allowing for attributes/spaces
    const thinkRegex = /<think\s*>([\s\S]*?)(?:<\/think>|$)/i;
    const match = content.match(thinkRegex);

    // DEBUG: Check if we are receiving think tags
    if (content.includes('<think')) {
        console.log('[DEBUG] MessageRenderer found <think> tag. Match:', !!match);
    }

    // Check if we have an open tag (case insensitive)
    const hasOpenTag = /<think/i.test(content);
    // Check if we have a close tag (case insensitive)
    const hasCloseTag = /<\/think>/i.test(content);

    let thoughtContent = null;
    let finalContent = content;

    if (match) {
        thoughtContent = match[1].trim();
        // Remove the think block from final content
        finalContent = content.replace(thinkRegex, '').trim();
    }

    // Process content to wrap citations [1], [2], [Doc 1], etc.
    const processCitations = React.useCallback((text: string) => {
        // Broad regex to catch [1], [Doc 1], [Source 1]
        const parts = text.split(/(\[Doc \d+\]|\[\d+\])/g);
        return parts.map((part, i) => {
            if (part.match(/^\[(Doc\s+)?\d+\]$/)) {
                return (
                    <Citation
                        key={i}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {part}
                    </Citation>
                );
            }
            return part;
        });
    }, []);

    // We need resolvedMode for ThinkingBlock styles.
    // Since we can't easily change the hook signature without refactoring parent, 
    // we'll rely on the parent theme provider or context if possible. 
    // BUT MessageBubble DOES have resolvedMode. Ideally, we pass it down.
    // For this implementation, I will treat 'dark' as default or simple check.
    // Better: Add 'resolvedMode' optional prop to MessageRenderer.

    // Markdown Components Definition
    const markdownComponents = {
        // Code blocks with syntax highlighting
        code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            const isBlock = match || codeContent.includes('\n');

            if (isBlock) {
                return (
                    <CodeBlock
                        language={match ? match[1] : ''}
                        value={codeContent}
                    />
                );
            }

            // Inline code
            return <InlineCode {...props}>{children}</InlineCode>;
        },
        // ... (keep other components similar to before)
        p({ children }: any) {
            const processedChildren = React.Children.map(children, child => {
                if (typeof child === 'string') {
                    return processCitations(child);
                }
                return child;
            });
            return <Typography component="p" variant="body1">{processedChildren}</Typography>;
        },
        a({ href, children }: any) {
            return (
                <StyledLink href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                </StyledLink>
            );
        },
        ul({ children }: any) { return <Box component="ul">{children}</Box>; },
        ol({ children }: any) { return <Box component="ol">{children}</Box>; },
        li({ children }: any) {
            const processedChildren = React.Children.map(children, child => {
                if (typeof child === 'string') {
                    return processCitations(child);
                }
                return child;
            });
            return <Typography component="li" variant="body1">{processedChildren}</Typography>;
        },
        h1({ children }: any) { return <Typography variant="h5" component="h1" color="text.primary" sx={{ mt: 2, mb: 1 }}>{children}</Typography>; },
        h2({ children }: any) { return <Typography variant="h6" component="h2" color="text.primary" sx={{ mt: 2, mb: 1 }}>{children}</Typography>; },
        h3({ children }: any) { return <Typography variant="subtitle1" component="h3" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5 }}>{children}</Typography>; },
        h4({ children }: any) { return <Typography variant="subtitle2" component="h4" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5 }}>{children}</Typography>; },
        h5({ children }: any) { return <Typography variant="button" component="h5" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>{children}</Typography>; },
        h6({ children }: any) { return <Typography variant="caption" component="h6" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5, display: 'block', textTransform: 'uppercase' }}>{children}</Typography>; },
        blockquote({ children }: any) { return <Box component="blockquote">{children}</Box>; },
        strong({ children }: any) { return <Typography component="strong" fontWeight={700} sx={{ display: 'inline' }}>{children}</Typography>; },
        em({ children }: any) { return <Typography component="em" fontStyle="italic" sx={{ display: 'inline' }}>{children}</Typography>; },
        table({ children }: any) {
            return (
                <Box sx={{ overflowX: 'auto', display: 'block', maxWidth: '100%', my: 2 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        {children}
                    </table>
                </Box>
            );
        },
    };

    return (
        <MarkdownContainer>
            {thoughtContent !== null && (
                <ThinkingBlock
                    content={thoughtContent}
                    resolvedMode={resolvedMode}
                    isStreaming={hasOpenTag && !hasCloseTag}
                />
            )}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
            >
                {finalContent}
            </ReactMarkdown>
        </MarkdownContainer>
    );
}, (prevProps, nextProps) => {
    return prevProps.content === nextProps.content &&
        prevProps.role === nextProps.role;
});

export default MessageRenderer;
