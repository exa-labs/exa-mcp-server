{
  description = "A Model Context Protocol server with Exa which does web search";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.buildNpmPackage {
          pname = "exa-mcp-server";
          version = "0.1.0";
          src = ./.;
          npmDepsHash = "sha256-w8OYNs/ETFcyni5C+uR8F7H4KHQ7uUHobicaIlJVawo=";
          makeCacheWritable = true;
          
          buildPhase = ''
            # First run the build
            npm run build
            
            # Make the output directory
            mkdir -p $out/lib/node_modules/exa-mcp-server
          '';

          installPhase = ''
            # Copy the entire package with node_modules
            cp -r . $out/lib/node_modules/exa-mcp-server/
            
            # Create bin directory and symlink
            mkdir -p $out/bin
            chmod +x $out/lib/node_modules/exa-mcp-server/build/index.js
            ln -s $out/lib/node_modules/exa-mcp-server/build/index.js $out/bin/exa-mcp-server
          '';

          meta = with pkgs.lib; {
            description = "A Model Context Protocol server with Exa which does web search";
            homepage = "https://github.com/exa-labs/exa-mcp-server";
            license = licenses.mit;
            mainProgram = "exa-mcp-server";
            maintainers = [];
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_18
            nodePackages.typescript
            nodePackages.npm
          ];
        };
      }
    );
}