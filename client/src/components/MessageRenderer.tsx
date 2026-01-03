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
const MarkdownContainer = styled(Box)(({ theme }) => ({
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
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        background: 'rgba(0, 229, 255, 0.1)',
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
        background: 'rgba(0, 229, 255, 0.1)',
        fontWeight: 600,
    },
}));

const InlineCode = styled('code')(({ theme }) => ({
    background: 'rgba(0, 229, 255, 0.15)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: '0.875em',
    fontFamily: '"Fira Code", "Consolas", monospace',
    color: theme.palette.primary.main,
}));

const StyledLink = styled(Link)(({ theme }) => ({
    color: theme.palette.secondary.main,
    textDecoration: 'none',
    '&:hover': {
        textDecoration: 'underline',
    },
}));

const MessageRenderer: React.FC<MessageRendererProps> = ({ content }) => {
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
                        return <Typography component="p" variant="body1">{children}</Typography>;
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
                        return <Typography component="li" variant="body1">{children}</Typography>;
                    },

                    // Headings
                    h1({ children }) {
                        return <Typography variant="h5" component="h1">{children}</Typography>;
                    },
                    h2({ children }) {
                        return <Typography variant="h6" component="h2">{children}</Typography>;
                    },
                    h3({ children }) {
                        return <Typography variant="subtitle1" component="h3" fontWeight={600}>{children}</Typography>;
                    },

                    // Blockquote
                    blockquote({ children }) {
                        return <Box component="blockquote">{children}</Box>;
                    },

                    // Strong/Bold
                    strong({ children }) {
                        return <Typography component="strong" fontWeight={700}>{children}</Typography>;
                    },

                    // Emphasis/Italic
                    em({ children }) {
                        return <Typography component="em" fontStyle="italic">{children}</Typography>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </MarkdownContainer>
    );
};

export default MessageRenderer;
