#!/bin/bash
cd /home/peter/nova_memory/nova-memory
export PYTHONPATH="/home/peter/nova_memory/nova-memory/src:$PYTHONPATH"
exec python3 -m nova_memory.cli.main mcp "$@"