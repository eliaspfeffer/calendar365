# Homebrew formula for calendar365
# To install from a tap: brew install eliaspfeffer/tap/calendar365
# Or use the formula directly: brew install --formula ./Formula/calendar365.rb

class Calendar365 < Formula
  desc "A year-at-a-glance planner with a zoomable 365-day view and sticky notes"
  homepage "https://github.com/eliaspfeffer/calendar365"
  url "https://registry.npmjs.org/calendar365/-/calendar365-1.0.0.tgz"
  sha256 "PLACEHOLDER_SHA256" # Update this after publishing to npm
  license "MIT"

  depends_on "node@18"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  def post_install
    ohai "calendar365 installed successfully!"
    ohai "Run 'calendar365' to start the server, or 'calendar365 --help' for options"
  end

  test do
    assert_match "calendar365", shell_output("#{bin}/calendar365 --version")
  end
end

