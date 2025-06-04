#!/bin/bash
cd /home/peter/nova_memory/nova-memory
export PYTHONPATH="$PYTHONPATH:/home/peter/nova_memory/nova-memory/src"
python3 -m basic_memory.cli.main mcp "$@"