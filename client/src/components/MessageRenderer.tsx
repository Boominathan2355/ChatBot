import React from 'react';
import { Box, Typography, Link, styled } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MessageRendererProps {
    content: string;
    role: 'user' | 'assistant' | 'system';
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

const MessageRenderer: React.FC<MessageRendererProps> = React.memo(({ content }) => {
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

    return (
        <MarkdownContainer>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks with syntax highlighting
                    code({ className, children, ...props }) {
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

                    // Paragraphs
                    p({ children }) {
                        // If children is just text, process citations
                        const processedChildren = React.Children.map(children, child => {
                            if (typeof child === 'string') {
                                return processCitations(child);
                            }
                            return child;
                        });
                        return <Typography component="p" variant="body1">{processedChildren}</Typography>;
                    },

                    // Links
                    a({ href, children }) {
                        return (
                            <StyledLink href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                            </StyledLink>
                        );
                    },

                    // Lists
                    ul({ children }) {
                        return <Box component="ul">{children}</Box>;
                    },
                    ol({ children }) {
                        return <Box component="ol">{children}</Box>;
                    },
                    li({ children }) {
                        const processedChildren = React.Children.map(children, child => {
                            if (typeof child === 'string') {
                                return processCitations(child);
                            }
                            return child;
                        });
                        return <Typography component="li" variant="body1">{processedChildren}</Typography>;
                    },

                    // Headings
                    h1({ children }) {
                        return <Typography variant="h5" component="h1" color="text.primary" sx={{ mt: 2, mb: 1 }}>{children}</Typography>;
                    },
                    h2({ children }) {
                        return <Typography variant="h6" component="h2" color="text.primary" sx={{ mt: 2, mb: 1 }}>{children}</Typography>;
                    },
                    h3({ children }) {
                        return <Typography variant="subtitle1" component="h3" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5 }}>{children}</Typography>;
                    },
                    h4({ children }) {
                        return <Typography variant="subtitle2" component="h4" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5 }}>{children}</Typography>;
                    },
                    h5({ children }) {
                        return <Typography variant="button" component="h5" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5, display: 'block' }}>{children}</Typography>;
                    },
                    h6({ children }) {
                        return <Typography variant="caption" component="h6" fontWeight={600} color="text.primary" sx={{ mt: 1.5, mb: 0.5, display: 'block', textTransform: 'uppercase' }}>{children}</Typography>;
                    },

                    // Blockquote
                    blockquote({ children }) {
                        return <Box component="blockquote">{children}</Box>;
                    },

                    // Strong/Bold
                    strong({ children }) {
                        return <Typography component="strong" fontWeight={700} sx={{ display: 'inline' }}>{children}</Typography>;
                    },

                    // Emphasis/Italic
                    em({ children }) {
                        return <Typography component="em" fontStyle="italic" sx={{ display: 'inline' }}>{children}</Typography>;
                    },

                    // Table wrapper for horizontal scrolling
                    table({ children }) {
                        return (
                            <Box sx={{ overflowX: 'auto', display: 'block', maxWidth: '100%', my: 2 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    {children}
                                </table>
                            </Box>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </MarkdownContainer>
    );
}, (prevProps, nextProps) => {
    // Only re-render if content actually changed
    return prevProps.content === nextProps.content && prevProps.role === nextProps.role;
});

export default MessageRenderer;
