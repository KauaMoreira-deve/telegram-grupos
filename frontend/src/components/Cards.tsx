import './Cards.css'

function Card({numero, descricao}: {numero: number, descricao: string}) {
    return (
        <div className="card-content">

            <div className="card">
                <h3>{numero}</h3>
                <p>{descricao}</p>
            </div>

        </div>
    )
}

export default Card