import prisma from '../../lib/prisma';
import { AppError } from '../../utils/errors';

export const getInvoiceService = async (
id: string,
organizationId: string
) => {
// Using findFirst to securely scope the query to the user's organization
const invoice = await prisma.invoice.findFirst({
where: {
id,
organizationId,
},
include: {
client: {
select: {
id: true,
name: true,
companyName: true,
email: true,
phone: true,
address: true,
},
},
fundingSource: true,
items: {
include: {
timeEntry: {
include: {
serviceCode: true,
},
},
},
},
payments: {
orderBy: {
paymentDate: 'desc',
},
},
timeEntries: {
select: {
id: true,
date: true,
duration: true,
billingStatus: true,
},
},
},
});

if (!invoice) {
throw new AppError('Invoice not found', 404);
}

return invoice;
};
