"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import AddressAutocomplete from "@/app/components/AddressAutocomplete"

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    role: "user",
    created_at: "",
    referral_code: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<any[]>([])
  const [newAddress, setNewAddress] = useState({ label: "Home", address: "" })
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const [points, setPoints] = useState({ balance: 0, lifetime_earned: 0 })
  const [pointsHistory, setPointsHistory] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ friendsJoined: 0, pendingWash: 0, earnedBonus: 0 })
  const router = useRouter()
  const supabase = createClient()

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function fetchAddresses(uid: string) {
      const { data } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
      if (data) setAddresses(data)
    }

    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) {
        addToast("Error fetching profile", "error")
      } else {
        let profileData = data
        if (!profileData.referral_code) {
          const newCode = `FP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
          const { data: updated } = await supabase.from('profiles').update({ referral_code: newCode }).eq('id', user.id).select().single()
          if (updated) profileData = updated
        }

        setProfile({
          ...profileData,
          email: user.email || ""
        })
        fetchAddresses(user.id)
        
        // Fetch Points
        const { data: pts } = await supabase.from("user_points").select("*").eq("user_id", user.id).single()
        if (pts) setPoints(pts)
        
        // Fetch History
        const { data: hist } = await supabase
          .from("points_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
        if (hist) setPointsHistory(hist)

        // Fetch Referral Stats
        const { count: joinedCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id)
        const referralBonuses = hist?.filter(h => h.description?.toLowerCase().includes('referral')) || []
        const totalBonus = referralBonuses.reduce((sum, h) => sum + h.amount, 0)
        
        setReferralStats({
          friendsJoined: joinedCount || 0,
          pendingWash: Math.max(0, (joinedCount || 0) - referralBonuses.length),
          earnedBonus: totalBonus
        })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleAddAddress = async () => {
    if (!newAddress.address) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("user_addresses")
      .insert({
        user_id: user.id,
        label: newAddress.label,
        address: newAddress.address,
        is_default: addresses.length === 0
      })
      .select()
      .single()

    if (error) {
      addToast(error.message, "error")
    } else {
      setAddresses([data, ...addresses])
      setNewAddress({ label: "Home", address: "" })
      addToast("Address added!", "success")
    }
  }

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", id)

    if (!error) {
      setAddresses(addresses.filter(a => a.id !== id))
      addToast("Address removed", "info")
    }
  }

  const setDefaultAddress = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Unset all
    await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id)
    // Set new default
    await supabase.from("user_addresses").update({ is_default: true }).eq("id", id)

    setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })))
    addToast("Default address updated", "success")
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast("Profile updated successfully!", "success")
    }
    setSaving(false)
  }

  if (loading || !mounted) {
    return (
      <div className="home-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  const initials = profile.full_name?.trim() 
    ? profile.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "FP"

  const memberSince = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString()
    : "Recent"

  return (
    <div className="home-root">
      <Navbar user={{ name: profile.full_name, email: profile.email, role: profile.role }} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="mesh-bg" style={{ 
        background: 'radial-gradient(circle at 20% 20%, rgba(79, 195, 247, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(245, 200, 66, 0.03) 0%, transparent 40%)',
        animation: 'meshMove 20s infinite alternate linear',
        opacity: 0.6
      }}></div>
      <style jsx>{`
        @keyframes meshMove {
          from { transform: scale(1) translate(0, 0); }
          to { transform: scale(1.1) translate(20px, -20px); }
        }
      `}</style>

      <main style={{ padding: '120px 24px 60px', maxWidth: '800px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="profile-header glass" 
          style={{ padding: '40px', borderRadius: '32px', display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '32px' }}
        >
          <div className="profile-avatar" style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'var(--accent-blue)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 900,
            color: 'white',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)'
          }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>{profile.full_name || 'My Profile'}</h1>
              <span style={{ 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.7rem', 
                fontWeight: 800,
                background: profile.role === 'admin' ? '#ef444420' : profile.role === 'worker' ? '#3b82f620' : 'rgba(255,255,255,0.1)',
                color: profile.role === 'admin' ? '#ef4444' : profile.role === 'worker' ? '#3b82f6' : 'var(--text-muted)',
                border: '1px solid currentColor',
                textTransform: 'uppercase'
              }}>
                {profile.role}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <div className="glass" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--accent-gold)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Balance</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-gold)' }}>🌟 {points.balance} Pts</p>
              </div>
              <div className="glass" style={{ padding: '8px 16px', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Lifetime Earned</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>🏆 {points.lifetime_earned}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '12px' }}>Member since {memberSince}</p>
          </div>
        </motion.div>

        {/* Elite Referral Invite Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{ 
            padding: '40px', 
            borderRadius: '32px', 
            marginBottom: '32px', 
            background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(245,200,66,0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background Decorative Circles */}
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '150px', height: '150px', background: 'var(--accent-gold)', opacity: 0.05, filter: 'blur(50px)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '100px', height: '100px', background: 'var(--accent-blue)', opacity: 0.05, filter: 'blur(40px)', borderRadius: '50%' }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(245,200,66,0.2)', color: 'var(--accent-gold)', padding: '6px 12px', borderRadius: '40px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', display: 'inline-block' }}>
                  Premium Invite program
                </span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
                  Share the Excellence, <br/>Earn <span style={{ color: 'var(--accent-gold)' }}>500 Pts</span> 🎁
                </h3>
                <p style={{ color: 'rgba(238,242,255,0.6)', fontSize: '0.95rem', maxWidth: '380px', lineHeight: 1.5 }}>
                  Give friends 200 pts to start. Get 500 pts when they complete their first elite clean.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--accent-gold)' }}>500</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>PTS PER REFERRAL</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              <div className="glass" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px' }}>FRIENDS JOINED</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{referralStats.friendsJoined}</p>
              </div>
              <div className="glass" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px' }}>PENDING BONUS</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{referralStats.pendingWash}</p>
              </div>
              <div className="glass" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px' }}>TOTAL EARNED</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{referralStats.earnedBonus}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ 
                flex: 1,
                background: 'rgba(0,0,0,0.2)', 
                padding: '16px 24px', 
                borderRadius: '16px', 
                border: '1.5px dashed rgba(245,200,66,0.3)',
                fontSize: '1.3rem',
                fontWeight: 950,
                letterSpacing: '3px',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
              }}>
                {profile.referral_code || "GEN-ERING..."}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile.referral_code || "")
                  addToast("Referral code copied!", "success")
                }}
                className="btn-primary" 
                style={{ padding: '16px 32px', borderRadius: '16px', fontSize: '0.9rem', boxShadow: '0 10px 20px rgba(245,200,66,0.2)' }}
              >
                Copy My Code
              </button>
            </div>
          </div>
        </motion.div>

        <div className="glass" style={{ padding: '40px', borderRadius: '32px', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 800 }}>PressPoints History</h3>
          {pointsHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No points history yet. Start ordering to earn points!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pointsHistory.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{h.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: h.amount > 0 ? '#10b981' : '#ef4444' }}>
                    {h.amount > 0 ? `+${h.amount}` : h.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleUpdate} className="profile-form glass" style={{ padding: '40px', borderRadius: '32px' }}>
          <h3 style={{ marginBottom: '32px', fontSize: '1.4rem', fontWeight: 800 }}>Account Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="mform-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={profile.full_name || ""} 
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                placeholder="Ex: John Doe"
              />
            </div>
            <div className="mform-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                value={profile.phone || ""} 
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <div className="mform-group" style={{ marginBottom: '32px' }}>
            <label>Default Pickup Address</label>
            <AddressAutocomplete 
              value={profile.address || ""}
              onChange={(val) => setProfile({...profile, address: val})}
              placeholder="Search or enter your full address..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '14px 40px', fontSize: '1rem' }}>
              {saving ? <div className="spinner"></div> : "Save Changes"}
            </button>
          </div>
        </form>

        <div className="glass" style={{ padding: '40px', borderRadius: '32px', marginTop: '32px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 800 }}>Manage Saved Addresses</h3>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <select 
              value={newAddress.label}
              onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
              style={{ width: '120px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Gym">Gym</option>
              <option value="Other">Other</option>
            </select>
            <div style={{ flex: 1 }}>
              <AddressAutocomplete 
                value={newAddress.address}
                onChange={(val) => setNewAddress({...newAddress, address: val})}
                placeholder="Enter new address..."
              />
            </div>
            <button onClick={handleAddAddress} className="btn-primary" style={{ height: '52px', padding: '0 24px' }}>Add</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {addresses.map(addr => (
              <div 
                key={addr.id} 
                className="glass" 
                style={{ 
                  padding: '20px', 
                  borderRadius: '20px', 
                  border: addr.is_default ? '1px solid #f5c842' : '1px solid rgba(255,255,255,0.05)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#f5c842', fontSize: '0.8rem', textTransform: 'uppercase' }}>{addr.label}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!addr.is_default && (
                      <button 
                        onClick={() => setDefaultAddress(addr.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        Set Default
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteAddress(addr.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4b2b', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{addr.address}</p>
                {addr.is_default && <div style={{ fontSize: '0.65rem', color: '#f5c842', marginTop: '8px', fontWeight: 700 }}>DEFAULT ADDRESS</div>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
