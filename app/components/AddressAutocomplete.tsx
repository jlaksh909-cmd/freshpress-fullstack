"use client"

import { useState, useEffect, useRef } from "react"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  required?: boolean
}

declare global {
  interface Window {
    google: any
  }
}

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search for your address...",
  style,
  required = false
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const autocompleteService = useRef<any>(null)
  const sessionToken = useRef<any>(null)

  useEffect(() => {
    // Load Google Maps Script if not present
    if (typeof window !== "undefined" && !window.google && !document.getElementById("google-maps-script")) {
      const script = document.createElement("script")
      script.id = "google-maps-script"
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)

    if (val.length < 3) {
      setSuggestions([])
      return
    }

    if (typeof window !== "undefined") {
      if (window.google) {
        // Google Maps Logic
        if (!autocompleteService.current) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService()
        }
        if (!sessionToken.current) {
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
        }

        setLoading(true)
        autocompleteService.current.getPlacePredictions(
          { input: val, sessionToken: sessionToken.current, types: ['address'] },
          (predictions: any[], status: any) => {
            if (status === 'OK' && predictions) {
              setSuggestions(predictions.map(p => ({
                description: p.description,
                main_text: p.structured_formatting.main_text,
                secondary_text: p.structured_formatting.secondary_text
              })))
              setShowDropdown(true)
            }
            setLoading(false)
          }
        )
      } else {
        // OpenStreetMap (Photon API) Fallback - TOTALLY FREE
        setLoading(true)
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            if (data.features) {
              setSuggestions(data.features.map((f: any) => {
                const props = f.properties
                const name = props.name || props.street || ""
                const city = props.city || props.state || ""
                const country = props.country || ""
                const fullText = [name, props.street, props.housenumber, city, country].filter(Boolean).join(", ")
                return {
                  description: fullText,
                  main_text: name || props.street || city,
                  secondary_text: [props.city, props.state, props.country].filter(Boolean).join(", ")
                }
              }))
              setShowDropdown(true)
            }
            setLoading(false)
          })
          .catch(() => setLoading(false))
      }
    }
  }

  const handleSelect = (suggestion: any) => {
    onChange(suggestion.description)
    setSuggestions([])
    setShowDropdown(false)
    sessionToken.current = null
  }

  return (
    <div className="address-autocomplete-container" style={{ position: 'relative', width: '100%', ...style }}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        className="autocomplete-input"
        style={{ width: '100%', borderRadius: '16px' }}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div className="autocomplete-dropdown glass" style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          zIndex: 1000, 
          marginTop: '8px', 
          borderRadius: '16px',
          maxHeight: '240px',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(7, 7, 26, 0.95)'
        }}>
          {suggestions.map((s, i) => (
            <div 
              key={i} 
              onClick={() => handleSelect(s)}
              className="suggestion-item"
              style={{ 
                padding: '12px 16px', 
                cursor: 'pointer', 
                borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>📍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.main_text}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{s.secondary_text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
          <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
        </div>
      )}

    </div>
  )
}
