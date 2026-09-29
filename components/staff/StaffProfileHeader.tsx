'use client';

import { useParams, useRouter } from 'next/navigation';
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';
import { staffService } from '@/lib/integrations/services/staff.service';
import toast from 'react-hot-toast';

interface StaffProfileHeaderProps {
    profile: any;
    staffName: string;
    staffDesignation: string;
    staffExperience: string;
}

export default function StaffProfileHeader({
    profile,
    staffName,
    staffDesignation,
    staffExperience
}: StaffProfileHeaderProps) {
    const params = useParams() as any;
    const router = useRouter();
    const hospitalId = params?.hospitalId as string;

    const handleBioSave = async (newBio: string) => {
        try {
            await staffService.updateProfile({ bio: newBio });
            toast.success("Bio updated successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to save bio");
            throw error;
        }
    };

    return (
        <ProfileHeroCard
            name={staffName}
            role={staffDesignation}
            roleBadge={`${staffExperience} INDUCTION`}
            roleColor="bg-indigo-100 text-indigo-700"
            imageUrl={(profile?.user as any)?.image || (profile?.user as any)?.profilePic}
            bio={profile?.bio || profile?.user?.bio}
            onBioSave={handleBioSave}
            onEditClick={() => router.push(`/${hospitalId}/staff/profile/edit`)}
            editLabel="Edit Index"
        />
    );
}

