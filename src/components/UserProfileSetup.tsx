import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Heart, Phone, MapPin } from "lucide-react";

export interface UserProfile {
  name: string;
  age: string;
  bloodType: string;
  medicalNotes: string;
  emergencyContacts: EmergencyContact[];
  preferredHospitals: Hospital[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Hospital {
  name: string;
  phone: string;
  address: string;
  coordinates: [number, number];
}

interface UserProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  initialProfile?: UserProfile;
}

const kuwaitHospitals: Hospital[] = [
  {
    name: "Al-Amiri Hospital",
    phone: "22451000",
    address: "Arabian Gulf Street, Kuwait City",
    coordinates: [47.9774, 29.3759]
  },
  {
    name: "Mubarak Al-Kabeer Hospital",
    phone: "25338888",
    address: "Jabriya, Kuwait",
    coordinates: [48.0193, 29.3117]
  },
  {
    name: "Farwaniya Hospital",
    phone: "24880000",
    address: "Farwaniya, Kuwait",
    coordinates: [47.9391, 29.2977]
  },
  {
    name: "Sabah Hospital",
    phone: "24812000",
    address: "Shuwaikh, Kuwait City",
    coordinates: [47.9293, 29.3375]
  }
];

export const UserProfileSetup = ({ isOpen, onClose, onSave, initialProfile }: UserProfileSetupProps) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile || {
    name: "",
    age: "",
    bloodType: "",
    medicalNotes: "",
    emergencyContacts: [{ name: "", phone: "", relationship: "" }],
    preferredHospitals: []
  });

  const addEmergencyContact = () => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: "", phone: "", relationship: "" }]
    }));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const toggleHospital = (hospital: Hospital) => {
    setProfile(prev => ({
      ...prev,
      preferredHospitals: prev.preferredHospitals.some(h => h.name === hospital.name)
        ? prev.preferredHospitals.filter(h => h.name !== hospital.name)
        : [...prev.preferredHospitals, hospital]
    }));
  };

  const handleSave = () => {
    onSave(profile);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border font-poppins">
        <DialogHeader>
          <DialogTitle className="text-cyber-blue flex items-center gap-2">
            <User className="h-5 w-5" />
            Guardian Profile Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
            <h3 className="font-semibold text-cyber-blue mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="bg-background/50"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="Enter your age"
                  className="bg-background/50"
                />
              </div>
              <div>
                <Label htmlFor="bloodType">Blood Type</Label>
                <Input
                  id="bloodType"
                  value={profile.bloodType}
                  onChange={(e) => setProfile(prev => ({ ...prev, bloodType: e.target.value }))}
                  placeholder="e.g., O+, A-, B+"
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="medicalNotes">Medical Notes & Allergies</Label>
              <Textarea
                id="medicalNotes"
                value={profile.medicalNotes}
                onChange={(e) => setProfile(prev => ({ ...prev, medicalNotes: e.target.value }))}
                placeholder="List any medical conditions, allergies, medications..."
                className="bg-background/50 min-h-20"
              />
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-cyber-green flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contacts
              </h3>
              <Button
                onClick={addEmergencyContact}
                size="sm"
                className="bg-cyber-green text-background"
              >
                Add Contact
              </Button>
            </div>
            <div className="space-y-3">
              {profile.emergencyContacts.map((contact, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 p-3 bg-background/30 rounded-lg">
                  <Input
                    value={contact.name}
                    onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                    placeholder="Name"
                    className="bg-background/50"
                  />
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                    placeholder="Phone"
                    className="bg-background/50"
                  />
                  <Input
                    value={contact.relationship}
                    onChange={(e) => updateEmergencyContact(index, "relationship", e.target.value)}
                    placeholder="Relationship"
                    className="bg-background/50"
                  />
                  <Button
                    onClick={() => removeEmergencyContact(index)}
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Preferred Hospitals */}
          <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/30">
            <h3 className="font-semibold text-cyber-red mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Preferred Hospitals in Kuwait
            </h3>
            <div className="space-y-2">
              {kuwaitHospitals.map((hospital) => (
                <div
                  key={hospital.name}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    profile.preferredHospitals.some(h => h.name === hospital.name)
                      ? "border-cyber-red bg-cyber-red/10"
                      : "border-border bg-background/30 hover:border-cyber-red/50"
                  }`}
                  onClick={() => toggleHospital(hospital)}
                >
                  <div className="font-medium">{hospital.name}</div>
                  <div className="text-sm text-muted-foreground">{hospital.address}</div>
                  <div className="text-xs text-muted-foreground">📞 {hospital.phone}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-[var(--gradient-primary)] text-white">
              Save Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};