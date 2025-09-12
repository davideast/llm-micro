# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  channel = "stable-25.05";
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_22
    pkgs.bun
  ];
  env = {};
  idx = {
    # Search https://open-vsx.org/. Use "publisher.id"
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
    ];
    # Workspace lifecycle hooks
    workspace = {
      onCreate = { };
      onStart = { };
    };
  };
}
