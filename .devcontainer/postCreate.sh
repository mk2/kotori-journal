#!/bin/bash

set -eux

mise settings add idiomatic_version_file_enable_tools node
mise install

npm install -g @anthropic-ai/claude-code
npx claude migrate-installer
echo 'alias claude="~/.claude/local/claude"' >> ~/.bashrc
echo 'export PATH=~/.claude/local:$PATH' >> ~/.bashrc