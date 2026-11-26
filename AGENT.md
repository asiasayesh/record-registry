# Record Registry

It is a record registry dashboard
left side would be the history along with some filters
the middle a 14px split resizer for drag resize
the right side would be the actual opened record

on start when no record is selected yet,
we can maybe show the last n past records openned or last 3

## UI

there is two vertical views
with a high width for the split aria label resize

so we have a main with three columns
the left side
the split aria-label resize
the right side

---

## Record

## Core

it needs a template - with things like
on left

- logo
- serial id
- auto locale date

and on right

- brand name
- tagline
- phone and fax
- mobile phone

another line bellow them

- record is for who and is it person or company

### first column

would be list of something
the default would be date
user can toggle to make the view be based on description
internally we will call it history panel or view or something

### second column

this is split resizer element for drag resize 14px width

### third column

this is the actual record with all fields rendered nicely

## Filters

### first column history

- filter by date
- fuzzy search by title and body

### create new form

- id Number
- description String
- quantity String
- price per unit
- total price

of course we would have our basic simple key value i18n for farsi

go simple vite vanilla js app, keep things simple, functional, pure, declarative and short
