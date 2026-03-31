type BAverageBadgeProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  variant?: "black" | "white";
};

const baseStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "2.16px",
  textTransform: "uppercase",
  textDecoration: "none",
  paddingTop: "4px",
  paddingBottom: "4px",
  paddingLeft: "6px",
  paddingRight: "5px",
  borderRadius: 0,
  lineHeight: 1,
  transition: "background-color 160ms ease, color 160ms ease",
};

const variants = {
  black: {
    backgroundColor: "#000000",
    color: "#ffffff",
    hoverBackgroundColor: "#ffffff",
    hoverColor: "#000000",
  },
  white: {
    backgroundColor: "#ffffff",
    color: "#000000",
    hoverBackgroundColor: "#000000",
    hoverColor: "#ffffff",
  },
} as const;

export default function BAverageBadge({
  href = "https://b-average.com",
  children = "B AVERAGE",
  variant = "white",
  style,
  ...props
}: BAverageBadgeProps) {
  const chosen = variants[variant] ?? variants.white;

  const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = chosen.hoverBackgroundColor;
    event.currentTarget.style.color = chosen.hoverColor;
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = chosen.backgroundColor;
    event.currentTarget.style.color = chosen.color;
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...baseStyle,
        backgroundColor: chosen.backgroundColor,
        color: chosen.color,
        ...style,
      }}
      {...props}
    >
      {children}
    </a>
  );
}
