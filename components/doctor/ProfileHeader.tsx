'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { useTenantLink } from '@/hooks/useTenantLink';
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import toast from 'react-hot-toast';

interface ProfileHeaderProps {
    profile: any;
    doctorName: string;
    doctorSpecialty: string;
    doctorExperience: string;
}

export default function ProfileHeader({
    profile,
    doctorName,
    doctorSpecialty,
    doctorExperience
}: ProfileHeaderProps) {
    const router = useRouter();
    const { getPath } = useTenantLink();

    const handleBioSave = async (newBio: string) => {
        try {
            await doctorService.updateProfile({ bio: newBio });
            toast.success("Bio updated successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to save bio");
            throw error;
        }
    };

    return (
        <ProfileHeroCard
            name={doctorName}
            role={doctorSpecialty}
            roleBadge={`${doctorExperience} Exp`}
            roleColor="bg-emerald-100 text-emerald-700"
            imageUrl={profile?.profilePic || profile?.user?.image || profile?.user?.avatar}
            bio={profile?.bio || profile?.user?.bio}
            onBioSave={handleBioSave}
            onEditClick={() => router.push(getPath('/doctor/profile/edit'))}
            editLabel="Edit Profile"
        />
    );
}


