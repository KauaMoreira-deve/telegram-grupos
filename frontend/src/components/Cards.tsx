import './Cards.css'

function Card({numero, descricao}: {numero: number | string, descricao: string}) {
    return (
        <div className="card-content">

            <div className="card">
                {/* Número em destaque, não título: um <h3> aqui quebrava a hierarquia (H1 → H3 → H2). */}
                <strong className="card-number">{numero}</strong>
                <p>{descricao}</p>
            </div>

        </div>
    )
}

export default Card
