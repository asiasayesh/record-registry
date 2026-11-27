in calculations we have

مانده این سند
amount
rest
prior
dept

while users can go to any record and add payment record that would dedeuct the rest

keep in mind payments cant go above the actual total price

and on every new record the prior records carry over

but we have another use case

in the entities page,

user can go and edit entity item and edit the dept column

the depth must be positive value

we have driffted from our original idea

we would have a list of entities with id, name and depth

and when we create a record we select one of the entities

at that point, at point of creation there would be a total
and there would be a total, paid, a rest, prior, dept

in each record page we do have a payment section
that user can add payment amount lower than total amount

in record creation view, user can select the buyer entity,
individual, company and others

user just have to select one of them, doesnt need a separate view

the dept is accumulated, so on every new record
the total dept,

user can add paymnents in the record page as payments,
and this would reduce that entity total dept

and also user can go to entities page have their total dept
user can change the dept from that entities page,
and so all records would reflect the updated value
the entities cant reduce the dept lower than the total

basically every purchase that create a record adds to a dept
that dept adds to the entity dept balance,
buyers can make one or more payments thorough the same record page
which would reduce their total entity balance

user adding payment in record page can not exceed the total amount

for example if we have an entity with zero dept
and he make a new purchase the record amount rest would show red to be paid

---

we have a major change planning, so far this app is for sales records

we are now considering keeping records of our purchases records

fields could be

- item
- units
- per unit cost
- total cost

our entities section then could have a switch for buyer or seller

also do a major refactor be more functional, declarative and clean
figure out which are fields and their required or not and their type
