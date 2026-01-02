{
  description = "hoo";

  inputs = {
    # Core Nixpkgs + compatibility
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-compat.url = "github:edolstra/flake-compat";
    flake-compat.flake = false;

    # Developer tools / utilities
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      treefmt-nix,
      ...
    }@inputs:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      # ------------------------------------------------------------
      # Development shell (nix develop .)
      # ------------------------------------------------------------
      devShells = forEachSystem (
        system:
        let
          devConfig = import ./nix/devshell.nix { inherit nixpkgs system; };
        in
        devConfig.devShells.${system}
      );

      # ------------------------------------------------------------
      # Apps (nix run .#dev)
      # ------------------------------------------------------------
      apps = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          # nix run .#dev - Start both Convex and UI
          dev = {
            type = "app";
            program = toString (pkgs.writeShellScript "dev" ''
              set -e
              cd "$(git rev-parse --show-toplevel)"
              
              # Load .env files
              if [[ -f apps/bingo/.env ]]; then
                set -a; source apps/bingo/.env; set +a
              fi
              if [[ -f apps/bingo/.env.local ]]; then
                set -a; source apps/bingo/.env.local; set +a
              fi
              
              # Start Convex in background
              ${pkgs.bun}/bin/bun run --filter @goals-bingo/bingo dev:convex &
              CONVEX_PID=$!
              trap "kill $CONVEX_PID 2>/dev/null" EXIT
              
              sleep 2
              
              # Start UI
              ${pkgs.bun}/bin/bun run --filter @goals-bingo/bingo dev
            '');
          };

          # nix run .#convex - Start Convex only
          convex = {
            type = "app";
            program = toString (pkgs.writeShellScript "convex" ''
              set -e
              cd "$(git rev-parse --show-toplevel)"
              
              if [[ -f apps/bingo/.env ]]; then
                set -a; source apps/bingo/.env; set +a
              fi
              if [[ -f apps/bingo/.env.local ]]; then
                set -a; source apps/bingo/.env.local; set +a
              fi
              
              ${pkgs.bun}/bin/bun run --filter @goals-bingo/bingo dev:convex
            '');
          };

          # nix run .#ui - Start UI only
          ui = {
            type = "app";
            program = toString (pkgs.writeShellScript "ui" ''
              set -e
              cd "$(git rev-parse --show-toplevel)"
              
              if [[ -f apps/bingo/.env ]]; then
                set -a; source apps/bingo/.env; set +a
              fi
              if [[ -f apps/bingo/.env.local ]]; then
                set -a; source apps/bingo/.env.local; set +a
              fi
              
              ${pkgs.bun}/bin/bun run --filter @goals-bingo/bingo dev
            '');
          };
        }
      );

      # ------------------------------------------------------------
      # Formatter (nix fmt)
      # ------------------------------------------------------------
      formatter = forEachSystem (
        system:
        (treefmt-nix.lib.evalModule nixpkgs.legacyPackages.${system} ./nix/treefmt.nix).config.build.wrapper
      );

      # ------------------------------------------------------------
      # Checks (nix flake check)
      # Runs formatting checks only
      # ------------------------------------------------------------
      checks = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          formatting = (treefmt-nix.lib.evalModule pkgs ./nix/treefmt.nix).config.build.check self;
        }
      );
    };
}
