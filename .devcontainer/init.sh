#!/bin/bash

# check gh token
if which gh &>/dev/null; then
    gh auth token | xargs -I {} echo "GH_TOKEN="{} > .devcontainer/.env.local.devcontainer
fi
