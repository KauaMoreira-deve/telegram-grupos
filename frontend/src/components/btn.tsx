import './btn.css'

type ButtonProps = {
  children: React.ReactNode
  href?: string
  className?: string
}

function Button({ children, href = '#', className = '' }: ButtonProps) {
  return (
    <a className={`telegram-button ${className}`.trim()} href={href}>
      {children}
    </a>
  )
}

export default Button
