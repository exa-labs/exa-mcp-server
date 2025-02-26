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
          npmDepsHash = pkgs.lib.fakeHash;
          makeCacheWritable = true;
          npmFlags = [ "--ignore-scripts" ];
          
          installPhase = ''
            mkdir -p $out/bin
            cp -r build $out/
            cp package.json $out/
            chmod +x $out/build/index.js
            ln -s $out/build/index.js $out/bin/exa-mcp-server
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