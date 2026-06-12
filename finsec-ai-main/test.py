lenght = int(input("Enter the Till how much you need the multiplication: "))
multiplier = int(input("Enter the number to be multiplied: "))

for i in range(1, lenght + 1):
    print(f"{i} x {multiplier} = {i * multiplier}")