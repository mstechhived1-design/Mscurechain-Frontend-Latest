export interface User {
  id: string;
  _id: string;
  name: string;
  role: string;
  email?: string;
  mobile?: string;
  gender?: string;
  status?: string;
  bio?: string;
  // Profile fields
  employeeId?: string;
  department?: string;
  address?: string;
  image?: string;
  avatar?: string;
  profilePic?: string;
  // Pharmacy/Shop fields
  shopName?: string;
  gstin?: string;
  licenseNo?: string;
  // Hospital field
  hospital?: string;
  hospitalId?: string;
  // Professional details
  qualificationDetails?: {
    qualifications: string[];
  };
  documents?: {
    degreeCertificate?: { url: string; publicId: string };
    registrationCertificate?: { url: string; publicId: string };
  };
}
