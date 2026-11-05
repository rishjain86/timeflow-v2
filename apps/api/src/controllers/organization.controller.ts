import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const createOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = res.locals.user?.id;
    const currentOrgId = res.locals.user?.organizationId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User ID missing.' });
      return;
    }

    const { 
      name, 
      domain, 
      companyName, 
      defaultCurrency, 
      timeZone 
    } = req.body;
    
    // 🟢 FIX: Using a Transaction to create the Org, save memberships, and switch the active Org safely
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new Organization
      const newOrg = await tx.organization.create({
        data: {
          name,
          domain,
          companyName,
          defaultCurrency,
          timeZone,
        },
      });

      // 2. AUTO-HEAL: Secure the user's CURRENT organization membership before switching
      // (This fixes the bug where the first organization disappears because signup didn't link it)
      if (currentOrgId) {
        await tx.organizationMember.upsert({
          where: {
            userId_organizationId: {
              userId: userId,
              organizationId: currentOrgId
            }
          },
          update: {}, // Do nothing if it already exists
          create: {
            userId: userId,
            organizationId: currentOrgId
          }
        });
      }

      // 3. Add the user as a member of the NEW Organization
      await tx.organizationMember.create({
        data: {
          userId: userId,
          organizationId: newOrg.id
        }
      });

      // 4. Switch the user's Active Organization context to the newly created one
      await tx.user.update({
        where: { id: userId },
        data: { organizationId: newOrg.id }
      });

      return newOrg;
    });

    res.status(201).json({ 
      success: true, 
      message: 'Organization created and switched successfully',
      data: { organization: result } 
    });
  } catch (error) {
    console.error('CREATE_ORGANIZATION_ERROR:', error);
    next(error);
  }
};

export const getOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      res.status(404).json({ success: false, message: 'Organization not found.' });
      return;
    }

    res.status(200).json({ success: true, data: { organization } });
  } catch (error) {
    console.error('GET_ORGANIZATION_ERROR:', error);
    next(error);
  }
};

export const updateOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const {
      name,
      domain,
      companyName,
      logoUrl,
      address,
      phone,
      email,
      website,
      defaultCurrency,
      taxRate,
      invoicePrefix,
      dueDays,
      invoiceNotes,
      footerText,
      defaultHourlyRate,
      timeZone,
      dateFormat,
      timeFormat,
      language,
      theme,
      notificationsOn,
    } = req.body;

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name !== undefined && { name }),
        ...(domain !== undefined && { domain }),
        ...(companyName !== undefined && { companyName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(defaultCurrency !== undefined && { defaultCurrency }),
        ...(taxRate !== undefined && { taxRate }),
        ...(invoicePrefix !== undefined && { invoicePrefix }),
        ...(dueDays !== undefined && { dueDays }),
        ...(invoiceNotes !== undefined && { invoiceNotes }),
        ...(footerText !== undefined && { footerText }),
        ...(defaultHourlyRate !== undefined && { defaultHourlyRate }),
        ...(timeZone !== undefined && { timeZone }),
        ...(dateFormat !== undefined && { dateFormat }),
        ...(timeFormat !== undefined && { timeFormat }),
        ...(language !== undefined && { language }),
        ...(theme !== undefined && { theme }),
        ...(notificationsOn !== undefined && { notificationsOn }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization: updatedOrganization },
    });
  } catch (error) {
    console.error('UPDATE_ORGANIZATION_ERROR:', error);
    next(error);
  }
};
