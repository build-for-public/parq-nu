"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Car, Clock, DollarSign, Search, Filter, Navigation } from "lucide-react"

interface ParkingSpace {
  id: string
  name: string
  lat: number
  lng: number
  totalSpaces: number
  availableSpaces: number
  hourlyRate: number
  maxTimeLimit: string
  type: string
  amenities: string[]
}

interface ParkingSpaceWithDistance extends ParkingSpace {
  distance: number
}

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c * 1000 // Convert to meters
  return distance
}

export default function ParkingFinderApp() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [map, setMap] = useState<any>(null)
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([])
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [markers, setMarkers] = useState<any[]>([])
  const [locationMarkers, setLocationMarkers] = useState<any[]>([])
  // Start with Gothenburg Central Station as default location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 57.7089, lng: 11.9746 })
  const [locationName, setLocationName] = useState("Gothenburg Central Station")
  const [locationLoading, setLocationLoading] = useState(false)
  const [isActualUserLocation, setIsActualUserLocation] = useState(false)

  // Load parking data
  useEffect(() => {
    const loadParkingData = async () => {
      try {
        const response = await fetch("parking-data.json")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: ParkingSpace[] = await response.json()
        console.log("Loaded parking data:", data.length, "spaces")
        setParkingSpaces(data)
      } catch (error) {
        console.error("Error loading parking data:", error)
        setParkingSpaces([])
      }
    }
    loadParkingData()
  }, [])

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "demo-key",
        version: "weekly",
        libraries: ["marker", "places"], // Required for AdvancedMarkerElement and Places API
      })

      try {
        await loader.load()
        
        console.log("Google Maps API loaded")
        console.log("Marker library available:", !!(window.google as any)?.maps?.marker?.AdvancedMarkerElement)

        if (mapRef.current && window.google) {
          const defaultLocation = { lat: 57.7089, lng: 11.9746 }

          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: defaultLocation,
            zoom: 15,
            mapId: "DEMO_MAP_ID",
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          })

          mapInstanceRef.current = mapInstance
          setMap(mapInstance)
          
          // Set initial view
          updateMapVisualization(defaultLocation, false, "Gothenburg Central Station")

          // Setup Places Autocomplete
          if (searchInputRef.current) {
            const autocomplete = new (window.google as any).maps.places.Autocomplete(searchInputRef.current, {
              types: ["geocode", "establishment"],
              fields: ["geometry.location", "name"],
            })
            autocomplete.bindTo("bounds", mapInstance)

            autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace()
              if (place.geometry && place.geometry.location) {
                const location = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                }
                const name = place.name || "Selected Location"
                
                setUserLocation(location)
                setIsActualUserLocation(false)
                setLocationName(name)
                if(searchInputRef.current) searchInputRef.current.value = name

                updateMapVisualization(location, false, name)
              } else {
                console.warn("Autocomplete returned place with no geometry")
              }
            })
          }

          // Try to get user's actual location
          if (navigator.geolocation) {
            setLocationLoading(true)
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                }
                setUserLocation(location)
                setIsActualUserLocation(true)
                setLocationName("Your Location")
                setLocationLoading(false)
                updateMapVisualization(location, true, "Your Location")
              },
              (error) => {
                console.warn("Geolocation error:", error)
                setLocationLoading(false) // Keep using default
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 },
            )
          }
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error)
      }
    }

    initMap()
  }, [])

  const updateMapVisualization = (location: { lat: number, lng: number }, isGps: boolean, name: string) => {
    if (!mapInstanceRef.current || !window.google) return

    const map = mapInstanceRef.current
    map.panTo(location)
    map.setZoom(15)

    // Clear existing location-related markers (user or searched)
    locationMarkers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null) // For Circle
      } else if (marker.map) {
        marker.map = null // For AdvancedMarkerElement
      }
    })

    const markerColor = isGps ? "#4285f4" : "#ff6b35"
    const markerTitle = isGps ? "Your Location" : name

    const markerElement = document.createElement('div')
    markerElement.style.cssText = `
      width: 20px;
      height: 20px;
      background-color: ${markerColor};
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 10;
    `

    const locationMarker = new (window.google as any).maps.marker.AdvancedMarkerElement({
      position: location,
      map: map,
      title: markerTitle,
      content: markerElement,
      zIndex: 1000,
    })

    const circle = new window.google.maps.Circle({
      strokeColor: markerColor,
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: markerColor,
      fillOpacity: 0.1,
      map: map,
      center: location,
      radius: 500,
    })

    setLocationMarkers([locationMarker, circle])
  }



  // Get filtered parking spaces within 500m radius with pre-calculated distances (memoized to prevent infinite loops)
  const filteredSpacesWithDistance = useMemo(() => {
    const filtered = parkingSpaces
      .map((space) => {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, space.lat, space.lng)
        return { ...space, distance }
      })
      .filter((space) => {
        // Filter by 500m radius
        const withinRadius = space.distance <= 500
        return withinRadius
      })
    
    console.log("Filtered spaces:", filtered.length, "out of", parkingSpaces.length, "total spaces")
    console.log("User location:", userLocation)
    
    return filtered
  }, [parkingSpaces, userLocation])

  // Add markers to map
  useEffect(() => {
    console.log("Marker effect triggered:", { 
      mapExists: !!map, 
      spacesCount: filteredSpacesWithDistance.length,
      googleExists: !!window.google,
      userLocation 
    })
    
    if (map && filteredSpacesWithDistance.length > 0 && window.google) {
      // Clear existing markers
      markers.forEach((marker) => {
        if (marker.map) {
          marker.map = null // For AdvancedMarkerElement
        }
      })

      const newMarkers: any[] = []

      filteredSpacesWithDistance.forEach((space: ParkingSpaceWithDistance) => {
        const availabilityColor =
          space.availableSpaces > 10 ? "#22c55e" : space.availableSpaces > 5 ? "#f59e0b" : "#ef4444"

        const markerElement = document.createElement('div')
        markerElement.style.cssText = `
          width: 16px;
          height: 16px;
          background-color: ${availabilityColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `
        
        try {
          const marker = new (window.google as any).maps.marker.AdvancedMarkerElement({
            position: { lat: space.lat, lng: space.lng },
            map: map,
            title: space.name,
            content: markerElement,
          })
          
          console.log("Created marker for:", space.name, "at", space.lat, space.lng)
        
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 6px; min-width: 180px; max-width: 240px;">
                <h3 style="margin: 0 0 6px 0; font-weight: 600; font-size: 14px; line-height: 1.2;">${space.name}</h3>
                <div style="display: flex; flex-direction: column; gap: 3px; font-size: 12px;">
                  <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="font-size: 10px;">🚗</span>
                    <span>${space.availableSpaces}/${space.totalSpaces} available</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="font-size: 10px;">💰</span>
                    <span>${space.hourlyRate} kr/h</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="font-size: 10px;">📏</span>
                    <span>${Math.round(space.distance)}m away</span>
                  </div>
                </div>
              </div>
            `,
          })

          marker.addListener("click", () => {
            infoWindow.open({
              anchor: marker,
              map: map,
            })
            setSelectedSpace(space)
          })

          newMarkers.push(marker)
                 } catch (error) {
           console.error("Error creating marker for", space.name, ":", error)
         }
      })

      setMarkers(newMarkers)
    }
  }, [map, filteredSpacesWithDistance])

  // Function to manually request location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserLocation(location)
        setIsActualUserLocation(true)
        setLocationName("Your Location")
        setLocationLoading(false)
        updateMapVisualization(location, true, "Your Location")
      },
      (error) => {
        console.error("Geolocation error:", error)
        setLocationLoading(false)
        alert("Unable to get your location. Please check your browser settings.")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }

  const getAvailabilityColor = (availableSpaces: number) => {
    if (availableSpaces > 10) return "text-green-600"
    if (availableSpaces > 5) return "text-yellow-600"
    return "text-red-600"
  }

  const getAvailabilityText = (availableSpaces: number) => {
    if (availableSpaces > 10) return "Good availability"
    if (availableSpaces > 5) return "Limited availability"
    return "Very limited"
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            ParkFinder
          </h1>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={locationLoading}
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
            >
              <Navigation className={`h-3 w-3 md:h-4 md:w-4 ${locationLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {locationLoading ? 'Getting Location...' : 'My Location'}
              </span>
              <span className="sm:hidden">📍</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="px-2 md:px-3">
              <Filter className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search for a location..."
            defaultValue={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status indicator */}
        <div className="mt-2 text-xs md:text-sm text-gray-600">
          {isActualUserLocation ? (
            <span className="flex items-center gap-1 text-green-600">
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">Showing parking within 500m of your current location</span>
              <span className="sm:hidden">Near you</span>
            </span>
          ) : locationLoading ? (
            <span className="flex items-center gap-1 text-blue-600">
              <Navigation className="h-3 w-3 animate-spin" />
              <span className="hidden sm:inline">Getting your location...</span>
              <span className="sm:hidden">Getting location...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-orange-600">
              <MapPin className="h-3 w-3" />
              <span className="truncate">Showing parking within 500m of {locationName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="relative lg:flex-1">
          <div ref={mapRef} className="w-full h-48 md:h-56 lg:h-full" />
        </div>

        {/* Parking List (Mobile and Desktop) */}
        <div className="flex-1 lg:flex-initial lg:w-80 lg:border-l bg-white overflow-y-auto">
          {/* Mobile View */}
          <div className="lg:hidden">
            <div className="px-4 py-3">
              {/* Handle bar for mobile */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
              
              <h3 className="font-semibold text-base mb-3">Nearby Parking ({filteredSpacesWithDistance.length})</h3>
              
              <div className="space-y-3">
                {filteredSpacesWithDistance.map((space: ParkingSpaceWithDistance) => {
                  return (
                    <div
                      key={space.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      onClick={() => {
                        map?.panTo({ lat: space.lat, lng: space.lng })
                        map?.setZoom(17)
                        setSelectedSpace(space)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{space.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3 flex-shrink-0" />
                            {space.availableSpaces}/{space.totalSpaces}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 flex-shrink-0" />
                            {space.hourlyRate} kr/h
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className={`text-xs font-medium ${getAvailabilityColor(space.availableSpaces)} mb-1`}>
                          {getAvailabilityText(space.availableSpaces)}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {Math.round(space.distance)}m
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block">
            <div className="p-4">
              <h3 className="font-semibold mb-4">Parking Locations ({filteredSpacesWithDistance.length})</h3>
              <div className="space-y-3">
                {filteredSpacesWithDistance.map((space: ParkingSpaceWithDistance) => (
                  <Card
                    key={space.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSpace?.id === space.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => {
                      map?.panTo({ lat: space.lat, lng: space.lng })
                      map?.setZoom(16)
                      setSelectedSpace(space)
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium">{space.name}</CardTitle>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`text-xs font-medium ${getAvailabilityColor(space.availableSpaces)}`}>
                            {getAvailabilityText(space.availableSpaces)}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            {Math.round(space.distance)}m away
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <span>
                            {space.availableSpaces}/{space.totalSpaces} spaces available
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>{space.hourlyRate} kr/hour</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Max: {space.maxTimeLimit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
