import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Typography, styled } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useThemeMode } from '../context/ThemeContext';

interface CodeBlockProps {
    language: string;
    value: string;
}

const CodeContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    '&:hover .copy-button': {
        opacity: 1,
    },
}));

const LanguageLabel = styled(Typography)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    background: 'rgba(0, 229, 255, 0.2)',
    color: theme.palette.primary.main,
    borderBottomRightRadius: 8,
    zIndex: 1,
}));

const CopyButton = styled(IconButton)(() => ({
    position: 'absolute',
    top: 4,
    right: 4,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(4px)',
    '&:hover': {
        background: 'rgba(0, 229, 255, 0.3)',
    },
}));

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
    const { resolvedMode } = useThemeMode();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const customStyle = {
        margin: 0,
        padding: '2.5rem 1rem 1rem 1rem',
        borderRadius: 12,
        fontSize: '0.875rem',
        lineHeight: 1.6,
    };

    return (
        <CodeContainer>
            {language && <LanguageLabel>{language}</LanguageLabel>}
            <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                <CopyButton
                    className="copy-button"
                    onClick={handleCopy}
                    size="small"
                    color={copied ? 'success' : 'inherit'}
                >
                    {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </CopyButton>
            </Tooltip>
            <SyntaxHighlighter
                language={language || 'text'}
                style={resolvedMode === 'dark' ? oneDark : oneLight}
                customStyle={customStyle}
                wrapLines
                wrapLongLines
                showLineNumbers={value.split('\n').length > 3}
            >
                {value}
            </SyntaxHighlighter>
        </CodeContainer>
    );
};

export default CodeBlock;
