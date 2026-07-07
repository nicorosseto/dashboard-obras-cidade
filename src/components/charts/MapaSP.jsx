import { useMemo, useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import geojson from '../../data/subprefeituras-sp.geojson?url'
import { NOME_TO_SIGLA } from '../../data/subprefeituras-sp.js'
import { fmtNumero } from '../../lib/aggregations.js'

// Escala de cor linear do azul claro ao navy
function corPorIntensidade(valor, maximo) {
  if (!maximo || valor === 0) return '#F5F8FC'
  const pct = Math.min(1, valor / maximo)
  // Interpola entre #E8EEF7 (claro) e #1F3864 (navy)
  const r = Math.round(232 + (31 - 232) * pct)
  const g = Math.round(238 + (56 - 238) * pct)
  const b = Math.round(247 + (100 - 247) * pct)
  return `rgb(${r},${g},${b})`
}

// Mapa choropleth interativo de São Paulo (estilo Power BI):
// - `contagens`: Map<sigla, numero> (cor por intensidade).
// - `unidade`: rótulo no plural minúsculo (ex.: 'laudos', 'processos').
// - `selecionadas`: Set<sigla> atualmente filtradas (destaca em vermelho).
// - `onSelecionar(sigla)`: clique numa subprefeitura. Sem ela, mapa só leitura.
export default function MapaSP({
  titulo,
  contagens,
  unidade = 'laudos',
  selecionadas,
  onSelecionar,
}) {
  const [geo, setGeo] = useState(null)
  const temSelecao = selecionadas && selecionadas.size > 0
  const clicavel = typeof onSelecionar === 'function'
  // Substantivo capitalizado para o balão (ex.: 'laudos' -> 'Laudos')
  const Unidade = unidade.charAt(0).toUpperCase() + unidade.slice(1)

  useEffect(() => {
    fetch(geojson)
      .then((r) => r.json())
      .then(setGeo)
      .catch(console.error)
  }, [])

  const maximo = useMemo(() => {
    let m = 0
    for (const v of contagens.values()) if (v > m) m = v
    return m
  }, [contagens])

  const styleFn = (feature) => {
    const sigla = NOME_TO_SIGLA[feature.properties.name]
    const valor = sigla ? contagens.get(sigla) || 0 : 0
    const selecionada = sigla && selecionadas && selecionadas.has(sigla)
    if (selecionada) {
      // Destaque da selecionada: borda vermelha institucional grossa
      return {
        fillColor: corPorIntensidade(valor, maximo),
        weight: 3,
        color: '#C00000',
        fillOpacity: 0.95,
        className: clicavel ? 'cursor-pointer' : '',
      }
    }
    return {
      fillColor: corPorIntensidade(valor, maximo),
      weight: 0.6,
      color: '#FFFFFF',
      // Com seleção ativa, as demais ficam esmaecidas
      fillOpacity: temSelecao ? 0.3 : 0.95,
      className: clicavel ? 'cursor-pointer' : '',
    }
  }

  const onEachFeature = (feature, layer) => {
    const nome = feature.properties.name
    const sigla = NOME_TO_SIGLA[nome]
    const valor = sigla ? contagens.get(sigla) || 0 : 0
    layer.bindTooltip(
      `<strong>${nome}</strong><br/>${Unidade}: <strong>${fmtNumero(valor)}</strong>`,
      { sticky: true, direction: 'top', className: 'leaflet-tooltip-custom' }
    )
    if (clicavel && sigla) {
      layer.on('click', () => onSelecionar(sigla))
    }
  }

  // A key força o GeoJSON a repintar quando muda a cor (maximo) ou a seleção.
  const chaveSelecao = selecionadas
    ? Array.from(selecionadas).sort().join(',')
    : ''

  return (
    <div className="bg-white rounded-md shadow-card p-4 h-full flex flex-col">
      {titulo && (
        <h3 className="text-sm font-semibold text-navy mb-2 text-center uppercase tracking-wide">
          {titulo}
        </h3>
      )}
      <div className="flex-1 min-h-[300px]">
        <MapContainer
          center={[-23.65, -46.63]}
          zoom={10}
          scrollWheelZoom={false}
          attributionControl={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%', background: '#FFFFFF' }}
        >
          {geo && (
            <GeoJSON
              key={`${maximo}-${chaveSelecao}`}
              data={geo}
              style={styleFn}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-600">
        <span>Menos {unidade}</span>
        <div
          className="h-2 w-24 rounded-sm"
          style={{
            background: 'linear-gradient(to right, #E8EEF7, #1F3864)',
          }}
        />
        <span>Mais {unidade}</span>
      </div>
      {clicavel && (
        <p className="text-center text-[10px] text-gray-400 mt-1">
          {temSelecao
            ? 'Clique na subprefeitura destacada para limpar o filtro'
            : 'Clique numa subprefeitura para filtrar a tela'}
        </p>
      )}
    </div>
  )
}
