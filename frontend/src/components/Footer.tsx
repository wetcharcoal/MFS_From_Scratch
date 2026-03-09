export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-center text-sm text-muted-foreground md:text-left">
          Welcome to aseed.ca! Questions? Email us at{" "}
          <a
            href="mailto:mcgillfoodco@gmail.com"
            className="underline hover:text-foreground"
          >
            mcgillfoodco@gmail.com
          </a>
          . Thank you so much for joining, I hope you find use from this platform - Ty
        </p>
      </div>
    </footer>
  );
}
