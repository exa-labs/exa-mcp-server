#!/usr/bin/env bash
set -e
nix run nixpkgs#prefetch-npm-deps -- package-lock.json